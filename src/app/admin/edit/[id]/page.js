"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db, doc, getDoc, updateDoc, collection } from "@/lib/firebase";
import { ONLINE_MUSIC_PRESETS, getAudioSource } from "@/lib/onlineMusic";

export default function EditQuizPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
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
  const [musicType, setMusicType] = useState("preset");
  const [selectedMusic, setSelectedMusic] = useState("");
  const [customMusicUrl, setCustomMusicUrl] = useState("");
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const previewAudioRef = useRef(null);
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

  useEffect(() => {
    const loadQuiz = async () => {
      try {
        const docSnap = await getDoc(doc(db, "quizzes", id));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTitle(data.title || "");
          setDescription(data.description || "");
          setTimePerQuestion(data.timePerQuestion || 30);
          
          const music = data.musicFileName || "";
          if (!music) {
            setMusicType("none");
            setSelectedMusic("");
          } else if (ONLINE_MUSIC_PRESETS.some((p) => p.url === music)) {
            setMusicType("preset");
            setSelectedMusic(music);
          } else if (music.startsWith("http")) {
            setMusicType("custom");
            setCustomMusicUrl(music);
          } else {
            setMusicType("local");
            setSelectedMusic(music);
          }
          
          if (data.questions && data.questions.length > 0) {
             setQuestions(data.questions);
          } else {
             setQuestions([{ id: 1, question: "", options: ["", "", "", ""], correctAnswer: 0, points: 10 }]);
          }
        } else {
          router.push("/admin");
        }
      } catch (err) {
        console.error("Error loading quiz:", err);
      }
      setLoading(false);
    };

    loadQuiz();
  }, [id, router]);

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

  const getActiveMusicSource = () => {
    if (musicType === "preset") return selectedMusic;
    if (musicType === "local") return selectedMusic ? `/music/${selectedMusic}` : "";
    if (musicType === "custom") return customMusicUrl.trim();
    return "";
  };

  const togglePreview = () => {
    if (!previewAudioRef.current) return;
    if (previewPlaying) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setPreviewPlaying(false);
    } else {
      const src = getActiveMusicSource();
      if (!src) {
        setError("Pilih atau masukkan musik terlebih dahulu untuk preview.");
        return;
      }
      if (previewAudioRef.current) {
        previewAudioRef.current.src = src;
        const playPromise = previewAudioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setPreviewPlaying(true))
            .catch((err) => {
              if (err.name === "AbortError" || err.name === "NotAllowedError") {
                return;
              }
              console.warn("Preview audio warning:", err);
              setError("Gagal memutar audio preview.");
              setPreviewPlaying(false);
            });
        }
      }
    }
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
      const finalMusic =
        musicType === "none"
          ? ""
          : musicType === "custom"
          ? customMusicUrl.trim()
          : selectedMusic;

      const quizData = {
        title: title.trim(),
        description: description.trim(),
        timePerQuestion: Number(timePerQuestion),
        musicFileName: finalMusic,
        questions: questions.map((q, i) => ({
          id: i + 1,
          question: q.question.trim(),
          options: q.options.map((o) => o.trim()),
          correctAnswer: q.correctAnswer,
          points: q.points,
        }))
      };

      await updateDoc(doc(db, "quizzes", id), quizData);
      router.push(`/admin/quiz/${id}`);
    } catch (err) {
      console.error("Error updating quiz:", err);
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

  const totalPoints = questions.reduce(
    (sum, q) => sum + (Number(q.points) || 0),
    0
  );
  const estimatedSeconds = questions.length * (Number(timePerQuestion) || 30);
  const estimatedMinutes = Math.max(1, Math.ceil(estimatedSeconds / 60));

  if (loading) {
    return (
      <div className="loading-container" style={{ minHeight: "100vh", background: "var(--bg-light)" }}>
        <div className="spinner spinner-dark"></div>
        <p style={{ color: "var(--text-medium)" }}>Memuat data quiz...</p>
      </div>
    );
  }

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

      <div className="creator-landscape-container">
        <div className="creator-landscape-header">
          <div>
            <h1>Edit Quiz</h1>
            <p className="creator-landscape-subtitle">
              Perbarui pengaturan quiz dan modifikasi pertanyaan interaktif.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push(`/admin/quiz/${id}`)}
            className="btn btn-secondary btn-sm"
          >
            Kembali ke Detail
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="creator-landscape-grid">
            {/* Left Column: Sidebar / Sticky Settings */}
            <aside className="creator-sidebar">
              {/* Card 1: Quiz Information */}
              <div className="creator-card">
                <h3>Informasi Quiz</h3>
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
                    rows={3}
                    placeholder="Deskripsi singkat materi dan petunjuk pengerjaan..."
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
                    style={{ maxWidth: "140px" }}
                  />
                </div>
              </div>

              {/* Card 2: Background Music */}
              <div className="creator-card">
                <h3>Background Music</h3>
                <div style={{ display: "flex", gap: "6px", marginBottom: "12px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${musicType === "preset" ? "btn-purple" : "btn-light"}`}
                    onClick={() => {
                      setMusicType("preset");
                      setSelectedMusic(ONLINE_MUSIC_PRESETS[0].url);
                      if (previewPlaying && previewAudioRef.current) previewAudioRef.current.pause();
                      setPreviewPlaying(false);
                    }}
                  >
                    Preset Online
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${musicType === "local" ? "btn-purple" : "btn-light"}`}
                    onClick={() => {
                      setMusicType("local");
                      setSelectedMusic(musicList[0] || "");
                      if (previewPlaying && previewAudioRef.current) previewAudioRef.current.pause();
                      setPreviewPlaying(false);
                    }}
                  >
                    Lokal ({musicList.length})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${musicType === "custom" ? "btn-purple" : "btn-light"}`}
                    onClick={() => {
                      setMusicType("custom");
                      if (previewPlaying && previewAudioRef.current) previewAudioRef.current.pause();
                      setPreviewPlaying(false);
                    }}
                  >
                    URL Custom
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${musicType === "none" ? "btn-purple" : "btn-light"}`}
                    onClick={() => {
                      setMusicType("none");
                      setSelectedMusic("");
                      setCustomMusicUrl("");
                      if (previewPlaying && previewAudioRef.current) previewAudioRef.current.pause();
                      setPreviewPlaying(false);
                    }}
                  >
                    Tanpa Musik
                  </button>
                </div>

                {musicType === "preset" && (
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <select
                      className="input"
                      style={{ flex: 1, minWidth: 0 }}
                      value={selectedMusic}
                      onChange={(e) => {
                        setSelectedMusic(e.target.value);
                        if (previewPlaying && previewAudioRef.current) previewAudioRef.current.pause();
                        setPreviewPlaying(false);
                      }}
                    >
                      {ONLINE_MUSIC_PRESETS.map((p) => (
                        <option key={p.id} value={p.url}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={`btn btn-sm ${previewPlaying ? "btn-danger" : "btn-purple"}`}
                      onClick={togglePreview}
                      style={{ flexShrink: 0, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                      {previewPlaying ? (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="4" width="4" height="16" />
                            <rect x="14" y="4" width="4" height="16" />
                          </svg>
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                          <span>Tes Audio</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {musicType === "local" && (
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <select
                      className="input"
                      style={{ flex: 1, minWidth: 0 }}
                      value={selectedMusic}
                      onChange={(e) => {
                        setSelectedMusic(e.target.value);
                        if (previewPlaying && previewAudioRef.current) previewAudioRef.current.pause();
                        setPreviewPlaying(false);
                      }}
                    >
                      <option value="">-- Pilih File Musik --</option>
                      {musicList.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className={`btn btn-sm ${previewPlaying ? "btn-danger" : "btn-purple"}`}
                      onClick={togglePreview}
                      style={{ flexShrink: 0, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                      {previewPlaying ? (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="4" width="4" height="16" />
                            <rect x="14" y="4" width="4" height="16" />
                          </svg>
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                          <span>Tes Audio</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {musicType === "custom" && (
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input
                      type="url"
                      className="input"
                      style={{ flex: 1, minWidth: 0 }}
                      placeholder="https://.../music.mp3"
                      value={customMusicUrl}
                      onChange={(e) => {
                        setCustomMusicUrl(e.target.value);
                        if (previewPlaying && previewAudioRef.current) previewAudioRef.current.pause();
                        setPreviewPlaying(false);
                      }}
                    />
                    <button
                      type="button"
                      className={`btn btn-sm ${previewPlaying ? "btn-danger" : "btn-purple"}`}
                      onClick={togglePreview}
                      style={{ flexShrink: 0, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                      {previewPlaying ? (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="4" width="4" height="16" />
                            <rect x="14" y="4" width="4" height="16" />
                          </svg>
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                          <span>Tes Audio</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                <audio
                  ref={previewAudioRef}
                  onEnded={() => setPreviewPlaying(false)}
                  style={{ display: "none" }}
                />
              </div>

              {/* Card 3: Summary Stats */}
              <div className="creator-card">
                <h4>Ringkasan Quiz</h4>
                <div className="creator-stat-row">
                  <span>Jumlah Pertanyaan</span>
                  <strong>{questions.length}</strong>
                </div>
                <div className="creator-stat-row">
                  <span>Total Poin Maksimal</span>
                  <strong>{totalPoints}</strong>
                </div>
                <div className="creator-stat-row">
                  <span>Perkiraan Durasi</span>
                  <strong>~{estimatedMinutes} menit</strong>
                </div>
              </div>

              {/* Card 4: Actions */}
              <div className="creator-card creator-actions-card">
                {error && (
                  <div
                    style={{
                      background: "rgba(226, 27, 60, 0.1)",
                      border: "1px solid var(--answer-red)",
                      color: "var(--answer-red)",
                      borderRadius: "var(--radius-sm)",
                      padding: "10px",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                    }}
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-purple btn-lg"
                  style={{ width: "100%" }}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="spinner spinner-sm"></span>
                      Menyimpan Perubahan...
                    </>
                  ) : (
                    "Simpan Perubahan"
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => router.push(`/admin/quiz/${id}`)}
                  className="btn btn-light"
                  style={{ width: "100%" }}
                >
                  Batal
                </button>
              </div>
            </aside>

            {/* Right Column: Questions List & Import */}
            <main className="creator-main">
              {/* Main Questions Header */}
              <div className="creator-main-header">
                <h2>
                  Daftar Pertanyaan
                  <span className="creator-count-badge">
                    {questions.length} Soal
                  </span>
                </h2>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn btn-light btn-sm"
                    onClick={() => setShowAiken(!showAiken)}
                  >
                    {showAiken ? "Tutup Import Aiken" : "Import Format Aiken"}
                  </button>
                  <label
                    className="btn btn-light btn-sm"
                    style={{ cursor: "pointer", margin: 0, display: "inline-flex", alignItems: "center" }}
                  >
                    Import XML
                    <input
                      type="file"
                      accept=".xml"
                      style={{ display: "none" }}
                      onChange={handleXMLImport}
                    />
                  </label>
                </div>
              </div>

              {/* Aiken Import Drawer */}
              {showAiken && (
                <div className="creator-card" style={{ borderLeft: "4px solid var(--kahoot-purple)" }}>
                  <h3 style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}>
                    Import Cepat Format Aiken
                  </h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-medium)", marginBottom: "0.75rem", lineHeight: 1.5 }}>
                    Format teks Aiken: Baris pertama soal, baris pilihan diawali huruf kapital (A., B., C., D.), dan diakhiri dengan <code>ANSWER: X</code>.
                  </p>
                  <textarea
                    className="input"
                    style={{ width: "100%", height: "130px", marginBottom: "0.75rem", fontFamily: "monospace", fontSize: "0.85rem" }}
                    value={aikenText}
                    onChange={(e) => setAikenText(e.target.value)}
                    placeholder="Contoh:&#10;Ibu kota Indonesia adalah?&#10;A. Surabaya&#10;B. Nusantara&#10;C. Bandung&#10;D. Medan&#10;ANSWER: B"
                  />
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      className="btn btn-purple btn-sm"
                      onClick={handleAikenImport}
                    >
                      Proses & Tambahkan
                    </button>
                    <button
                      type="button"
                      className="btn btn-light btn-sm"
                      onClick={() => setShowAiken(false)}
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}

              {/* Questions List */}
              {questions.map((q, qIndex) => (
                <div key={qIndex} className="question-card">
                  <div className="question-card-header">
                    <span className="question-number">
                      Soal Nomor {qIndex + 1}
                    </span>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => removeQuestion(qIndex)}
                        title="Hapus soal ini"
                      >
                        Hapus Soal
                      </button>
                    )}
                  </div>

                  <div className="input-group" style={{ marginBottom: "1rem" }}>
                    <label>Isi Pertanyaan</label>
                    <textarea
                      className="input"
                      rows={2}
                      placeholder="Ketik pertanyaan di sini..."
                      value={q.question}
                      onChange={(e) =>
                        updateQuestion(qIndex, "question", e.target.value)
                      }
                      maxLength={500}
                    />
                  </div>

                  <label
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: "var(--text-medium)",
                      marginBottom: "0.5rem",
                      display: "block",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Pilihan Jawaban
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
                          placeholder={`Jawaban ${optionLabels[optIndex]}`}
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
                    <label>Kunci Jawaban Benar:</label>
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
                          Opsi {label}
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
            </main>
          </div>
        </form>
      </div>
    </>
  );
}
