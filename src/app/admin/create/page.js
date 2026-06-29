"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db, collection, addDoc, serverTimestamp } from "@/lib/firebase";

function generateInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function CreateQuizPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timePerQuestion, setTimePerQuestion] = useState(30);
  const [questions, setQuestions] = useState([
    {
      id: 1,
      question: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      points: 10,
    },
  ]);
  const [musicList, setMusicList] = useState([]);
  const [selectedMusic, setSelectedMusic] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showAiken, setShowAiken] = useState(false);
  const [aikenText, setAikenText] = useState("");

  useEffect(() => {
    fetch('/api/music')
      .then(res => res.json())
      .then(data => {
        if (data.files) {
          setMusicList(data.files);
        }
      })
      .catch(console.error);
  }, []);

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        question: "",
        options: ["", "", "", ""],
        correctAnswer: 0,
        points: 10,
      },
    ]);
  };

  const removeQuestion = (index) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateQuestion = (index, field, value) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const updateOption = (qIndex, optIndex, value) => {
    setQuestions((prev) => {
      const updated = [...prev];
      const opts = [...updated[qIndex].options];
      opts[optIndex] = value;
      updated[qIndex] = { ...updated[qIndex], options: opts };
      return updated;
    });
  };

  const handleAikenImport = () => {
    const lines = aikenText.split('\n').map(l => l.trim()).filter(l => l);
    const newQuestions = [];
    let currentQ = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^[A-D][\.\)]\s/.test(line)) {
        if (currentQ) {
          const optText = line.substring(2).trim();
          currentQ.options.push(optText);
        }
      } else if (line.startsWith('ANSWER:')) {
        if (currentQ) {
          const ans = line.substring(7).trim().toUpperCase();
          const ansIndex = ['A', 'B', 'C', 'D'].indexOf(ans);
          if (ansIndex !== -1) {
             currentQ.correctAnswer = ansIndex;
          }
          if (currentQ.options.length >= 2) {
             while (currentQ.options.length < 4) {
                 currentQ.options.push("");
             }
             newQuestions.push({...currentQ});
          }
          currentQ = null;
        }
      } else {
        currentQ = {
          id: newQuestions.length + 1,
          question: line,
          options: [],
          correctAnswer: 0,
          points: 10
        };
      }
    }
    
    if (newQuestions.length > 0) {
      setQuestions(newQuestions);
      setAikenText("");
      setShowAiken(false);
      setError("");
    } else {
      setError("Format Aiken tidak valid atau tidak ada soal yang ditemukan.");
    }
  };

  const handleXMLImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        
        // Cek error parsing XML
        const parseError = xmlDoc.getElementsByTagName("parsererror");
        if (parseError.length > 0) {
           setError("Format XML tidak valid.");
           return;
        }

        const qNodes = xmlDoc.getElementsByTagName("question");
        if (qNodes.length === 0) {
           setError("Tidak ada tag <question> ditemukan di file XML.");
           return;
        }

        const newQuestions = [];
        for (let i = 0; i < qNodes.length; i++) {
          const qNode = qNodes[i];
          const questionText = qNode.getElementsByTagName("text")[0]?.textContent || "";
          
          const optionsNode = qNode.getElementsByTagName("options")[0];
          const optionNodes = optionsNode ? optionsNode.getElementsByTagName("option") : [];
          const options = [];
          for (let j = 0; j < 4; j++) {
             options.push(optionNodes[j]?.textContent || "");
          }
          
          let correctAnswer = 0;
          const answerNode = qNode.getElementsByTagName("answer")[0];
          if (answerNode) {
             const ansText = answerNode.textContent.trim().toUpperCase();
             if (['A','B','C','D'].includes(ansText)) {
                correctAnswer = ['A','B','C','D'].indexOf(ansText);
             } else if (['0','1','2','3'].includes(ansText)) {
                correctAnswer = parseInt(ansText);
             } else {
                const idx = options.findIndex(o => o.trim().toUpperCase() === ansText);
                if (idx !== -1) correctAnswer = idx;
             }
          }
          
          let points = 10;
          const pointsNode = qNode.getElementsByTagName("points")[0];
          if (pointsNode) {
             points = parseInt(pointsNode.textContent) || 10;
          }

          if (questionText) {
             newQuestions.push({
               id: newQuestions.length + 1,
               question: questionText,
               options,
               correctAnswer,
               points
             });
          }
        }

        if (newQuestions.length > 0) {
          setQuestions(newQuestions);
          setError("");
        } else {
          setError("Gagal membaca pertanyaan dari XML.");
        }
      } catch (err) {
        console.error(err);
        setError("Gagal mem-parsing XML.");
      }
    };
    reader.readAsText(file);
    e.target.value = null; // reset input
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Judul quiz wajib diisi");
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        setError(`Pertanyaan ${i + 1} belum diisi`);
        return;
      }
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].trim()) {
          setError(`Opsi ${String.fromCharCode(65 + j)} pada pertanyaan ${i + 1} belum diisi`);
          return;
        }
      }
    }

    setSaving(true);

    try {
      const inviteCode = generateInviteCode();
      const quizData = {
        title: title.trim(),
        description: description.trim(),
        inviteCode,
        status: "draft",
        timePerQuestion: Number(timePerQuestion),
        musicFileName: selectedMusic,
        questions: questions.map((q, i) => ({
          id: i + 1,
          question: q.question.trim(),
          options: q.options.map((o) => o.trim()),
          correctAnswer: q.correctAnswer,
          points: q.points,
        })),
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "quizzes"), quizData);
      router.push(`/admin/quiz/${docRef.id}`);
    } catch (err) {
      console.error("Error creating quiz:", err);
      setError("Gagal menyimpan quiz. Coba lagi.");
      setSaving(false);
    }
  };

  const optionLabels = ["A", "B", "C", "D"];
  const optionColorClasses = [
    "option-label-a",
    "option-label-b",
    "option-label-c",
    "option-label-d",
  ];

  return (
    <>
      <nav className="navbar">
        <Link href="/" className="navbar-brand">
          QuizMaster<span className="brand-dot"></span>
        </Link>
        <div className="navbar-links">
          <Link href="/admin" className="btn btn-secondary btn-sm">
            Dashboard
          </Link>
        </div>
      </nav>

      <div className="creator-container">
        <h1 className="animate-fade-in-up">Buat Quiz Baru</h1>

        <form className="creator-form" onSubmit={handleSubmit}>
          {/* Quiz Info */}
          <div className="creator-section animate-fade-in-up delay-100">
            <h2>Informasi Quiz</h2>
            <div className="input-group" style={{ marginBottom: "1rem" }}>
              <label htmlFor="quiz-title">Judul Quiz</label>
              <input
                id="quiz-title"
                type="text"
                className="input"
                placeholder="Contoh: Quiz Matematika Kelas 10"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="input-group" style={{ marginBottom: "1rem" }}>
              <label htmlFor="quiz-desc">Deskripsi</label>
              <textarea
                id="quiz-desc"
                className="input"
                placeholder="Deskripsi singkat tentang quiz ini..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={300}
              />
            </div>
            <div className="input-group">
              <label htmlFor="time-per-q">Waktu per Soal (detik)</label>
              <input
                id="time-per-q"
                type="number"
                className="input"
                value={timePerQuestion}
                onChange={(e) => setTimePerQuestion(e.target.value)}
                min={5}
                max={120}
                style={{ maxWidth: "150px" }}
              />
            </div>
            <div className="input-group" style={{ marginTop: "1rem" }}>
              <label htmlFor="music-select">Background Music</label>
              <select
                id="music-select"
                className="input"
                value={selectedMusic}
                onChange={(e) => setSelectedMusic(e.target.value)}
              >
                <option value="">-- Tanpa Musik --</option>
                {musicList.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Questions */}
          <div className="creator-section animate-fade-in-up delay-200">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ marginBottom: 0 }}>Pertanyaan</h2>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="btn btn-light btn-sm"
                  onClick={() => setShowAiken(!showAiken)}
                >
                  {showAiken ? "Batal Aiken" : "Import Aiken"}
                </button>
                <label className="btn btn-light btn-sm" style={{ cursor: "pointer", margin: 0, display: "flex", alignItems: "center" }}>
                  Import XML
                  <input type="file" accept=".xml" style={{ display: "none" }} onChange={handleXMLImport} />
                </label>
              </div>
            </div>

            {showAiken && (
              <div style={{ marginBottom: "2rem", padding: "1rem", background: "var(--bg-light)", borderRadius: "var(--radius-md)" }}>
                <h3 style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>Paste Text Format Aiken</h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-medium)", marginBottom: "1rem" }}>
                  Contoh format:<br/>
                  Siapa penemu lampu pijar?<br/>
                  A. Thomas Edison<br/>
                  B. Albert Einstein<br/>
                  C. Nikola Tesla<br/>
                  D. Isaac Newton<br/>
                  ANSWER: A
                </p>
                <textarea
                  className="input"
                  style={{ width: "100%", height: "150px", marginBottom: "1rem" }}
                  value={aikenText}
                  onChange={(e) => setAikenText(e.target.value)}
                  placeholder="Paste soal-soal Anda di sini..."
                ></textarea>
                <button
                  type="button"
                  className="btn btn-purple btn-sm"
                  onClick={handleAikenImport}
                >
                  Proses Import
                </button>
              </div>
            )}

            {questions.map((q, qIndex) => (
              <div key={qIndex} className="question-card">
                <div className="question-card-header">
                  <span className="question-number">
                    Soal {qIndex + 1}
                  </span>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => removeQuestion(qIndex)}
                    >
                      Hapus
                    </button>
                  )}
                </div>

                <div className="input-group" style={{ marginBottom: "1rem" }}>
                  <label>Pertanyaan</label>
                  <textarea
                    className="input"
                    placeholder="Tulis pertanyaan di sini..."
                    value={q.question}
                    onChange={(e) =>
                      updateQuestion(qIndex, "question", e.target.value)
                    }
                    maxLength={500}
                  />
                </div>

                <label
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: "var(--text-medium)",
                    marginBottom: "0.5rem",
                    display: "block",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Opsi Jawaban
                </label>
                <div className="options-grid">
                  {q.options.map((opt, optIndex) => (
                    <div key={optIndex} className="option-input-wrapper">
                      <div className={`option-label ${optionColorClasses[optIndex]}`}>
                        {optionLabels[optIndex]}
                      </div>
                      <input
                        type="text"
                        className="input"
                        placeholder={`Opsi ${optionLabels[optIndex]}`}
                        value={opt}
                        onChange={(e) =>
                          updateOption(qIndex, optIndex, e.target.value)
                        }
                        maxLength={200}
                      />
                    </div>
                  ))}
                </div>

                <div className="correct-answer-section">
                  <label>Jawaban Benar:</label>
                  <select
                    value={q.correctAnswer}
                    onChange={(e) =>
                      updateQuestion(
                        qIndex,
                        "correctAnswer",
                        Number(e.target.value)
                      )
                    }
                  >
                    {optionLabels.map((label, i) => (
                      <option key={i} value={i}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <label style={{ marginLeft: "auto" }}>Poin:</label>
                  <input
                    type="number"
                    className="input"
                    value={q.points}
                    onChange={(e) =>
                      updateQuestion(qIndex, "points", Number(e.target.value))
                    }
                    min={1}
                    max={100}
                    style={{ width: "80px" }}
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              className="add-question-btn"
              onClick={addQuestion}
            >
              + Tambah Pertanyaan
            </button>
          </div>

          {error && (
            <p
              style={{
                color: "var(--answer-red)",
                fontSize: "0.9rem",
                fontWeight: 700,
                textAlign: "center",
              }}
            >
              {error}
            </p>
          )}

          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <Link href="/admin" className="btn btn-secondary">
              Batal
            </Link>
            <button
              type="submit"
              className="btn btn-purple btn-lg"
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="spinner spinner-sm"></span>
                  Menyimpan...
                </>
              ) : (
                "Simpan Quiz"
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
