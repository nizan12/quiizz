"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  db,
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from "@/lib/firebase";

export default function QuizPlayPage({ params }) {
  const { code } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const playerName = searchParams.get("name") || "Anonim";

  const [quizId, setQuizId] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [participantId, setParticipantId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [gameState, setGameState] = useState("loading");
  const [scorePopup, setScorePopup] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);
  const hasJoined = useRef(false);

  // Find quiz by invite code
  useEffect(() => {
    const findQuiz = async () => {
      if (hasJoined.current) return;
      hasJoined.current = true;

      try {
        const q = query(
          collection(db, "quizzes"),
          where("inviteCode", "==", code)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setGameState("not-found");
          return;
        }

        const quizDoc = snapshot.docs[0];
        const quizData = { id: quizDoc.id, ...quizDoc.data() };
        setQuizId(quizDoc.id);
        setQuiz(quizData);

        const sessionKey = `quiz_${quizDoc.id}_participant`;
        const storedParticipantId = sessionStorage.getItem(sessionKey);

        if (storedParticipantId) {
          setParticipantId(storedParticipantId);
        } else {
          const participantRef = await addDoc(
            collection(db, "quizzes", quizDoc.id, "participants"),
            {
              name: playerName,
              score: 0,
              answers: [],
              joinedAt: serverTimestamp(),
            }
          );
          setParticipantId(participantRef.id);
          sessionStorage.setItem(sessionKey, participantRef.id);
        }

        if (quizData.status === "active") {
          setGameState("playing");
          setTimeLeft(quizData.timePerQuestion || 30);
        } else if (quizData.status === "completed") {
          setGameState("finished");
        } else {
          setGameState("waiting");
        }
      } catch (err) {
        console.error("Error finding quiz:", err);
        setGameState("error");
      }
    };

    findQuiz();
  }, [code, playerName]);

  // Listen for quiz status changes
  useEffect(() => {
    if (!quizId) return;

    const unsub = onSnapshot(doc(db, "quizzes", quizId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setQuiz((prev) => (prev ? { ...prev, ...data } : null));

        if (data.status === "active" && gameState === "waiting") {
          setGameState("playing");
          setTimeLeft(data.timePerQuestion || 30);
        } else if (data.status === "completed") {
          setGameState("finished");
        }
      }
    });

    return () => unsub();
  }, [quizId, gameState]);

  // Countdown timer
  useEffect(() => {
    if (gameState !== "playing" || showResult) return;

    if (timeLeft <= 0) {
      handleTimeUp();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, gameState, showResult]);

  const handleTimeUp = useCallback(() => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(-1);
    setIsCorrect(false);
    setShowResult(true);
    setScorePopup({ correct: false, points: 0 });

    const newAnswer = {
      questionId: currentQuestion,
      selected: -1,
      correct: false,
      timeTaken: quiz.timePerQuestion || 30,
    };
    setAnswers((prev) => [...prev, newAnswer]);

    setTimeout(() => {
      setScorePopup(null);
      goToNextQuestion();
    }, 2000);
  }, [selectedAnswer, currentQuestion, quiz]);

  const handleAnswer = (optionIndex) => {
    if (selectedAnswer !== null || showResult) return;

    const question = quiz.questions[currentQuestion];
    const correct = optionIndex === question.correctAnswer;
    const timeTaken = (quiz.timePerQuestion || 30) - timeLeft;
    const points = correct ? Math.max(question.points, 1) : 0;
    const speedBonus = correct
      ? Math.round((timeLeft / (quiz.timePerQuestion || 30)) * 5)
      : 0;
    const totalPoints = points + speedBonus;

    setSelectedAnswer(optionIndex);
    setIsCorrect(correct);
    setShowResult(true);
    setScorePopup({ correct, points: totalPoints });

    const newScore = score + totalPoints;
    setScore(newScore);

    const newAnswer = {
      questionId: currentQuestion,
      selected: optionIndex,
      correct,
      timeTaken,
    };
    setAnswers((prev) => [...prev, newAnswer]);

    if (participantId && quizId) {
      updateDoc(doc(db, "quizzes", quizId, "participants", participantId), {
        score: newScore,
        answers: [...answers, newAnswer],
      }).catch(console.error);
    }

    setTimeout(() => {
      setScorePopup(null);
      goToNextQuestion();
    }, 2000);
  };

  const goToNextQuestion = () => {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setIsCorrect(false);
      setTimeLeft(quiz.timePerQuestion || 30);
    } else {
      setGameState("finished");
      if (participantId && quizId) {
        updateDoc(doc(db, "quizzes", quizId, "participants", participantId), {
          score,
          answers,
          completedAt: serverTimestamp(),
        }).catch(console.error);
      }
    }
  };

  const timerPercentage = quiz
    ? (timeLeft / (quiz.timePerQuestion || 30)) * 100
    : 100;
  const circumference = 2 * Math.PI * 34;
  const strokeDashoffset =
    circumference - (timerPercentage / 100) * circumference;
  const timerClass =
    timeLeft <= 5 ? "danger" : timeLeft <= 10 ? "warning" : "";

  const optionLabels = ["A", "B", "C", "D"];

  // Kahoot shape SVGs for answer blocks
  const optionShapes = [
    // Triangle
    <svg key="tri" viewBox="0 0 24 24" fill="white" width="24" height="24"><polygon points="12,3 22,21 2,21" /></svg>,
    // Diamond
    <svg key="dia" viewBox="0 0 24 24" fill="white" width="24" height="24"><polygon points="12,2 22,12 12,22 2,12" /></svg>,
    // Circle
    <svg key="cir" viewBox="0 0 24 24" fill="white" width="24" height="24"><circle cx="12" cy="12" r="10" /></svg>,
    // Square
    <svg key="squ" viewBox="0 0 24 24" fill="white" width="24" height="24"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>,
  ];

  // Loading
  if (gameState === "loading") {
    return (
      <div className="quiz-play-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p style={{ opacity: 0.7 }}>Mencari quiz...</p>
        </div>
      </div>
    );
  }

  // Not found
  if (gameState === "not-found" || gameState === "error") {
    return (
      <div className="quiz-play-container">
        <div className="waiting-room animate-scale-in">
          <h1>Quiz Tidak Ditemukan</h1>
          <p>Kode undangan &quot;{code}&quot; tidak valid atau sudah expired.</p>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => router.push("/")}
            style={{ marginTop: "1.5rem" }}
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  // Waiting room
  if (gameState === "waiting") {
    return (
      <div className="quiz-play-container">
        <div className="waiting-room animate-scale-in">
          <h1>Menunggu Quiz Dimulai</h1>
          <p>
            Halo <strong>{playerName}</strong>! Quiz &quot;{quiz?.title}&quot; akan segera
            dimulai.
          </p>
          <p style={{ fontSize: "0.85rem", opacity: 0.6, marginTop: "0.5rem" }}>
            Admin akan memulai quiz. Harap tunggu...
          </p>
          <div className="waiting-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    );
  }

  // Finished
  if (gameState === "finished") {
    return (
      <div className="quiz-play-container">
        <div className="waiting-room animate-bounce-in">
          <h1>Quiz Selesai!</h1>
          <p style={{ marginBottom: "0.5rem" }}>
            Skor Anda:{" "}
            <strong style={{ fontSize: "2rem" }}>{score}</strong>
          </p>
          <p style={{ fontSize: "0.85rem", opacity: 0.7 }}>
            Anda menjawab {answers.filter((a) => a.correct).length} dari{" "}
            {quiz?.questions?.length || 0} soal dengan benar
          </p>
          <button
            className="btn btn-primary btn-lg"
            onClick={() =>
              router.push(
                `/quiz/${code}/results?pid=${participantId}&qid=${quizId}`
              )
            }
            style={{ marginTop: "1.5rem" }}
          >
            Lihat Leaderboard
          </button>
        </div>
      </div>
    );
  }

  // Playing
  const question = quiz.questions[currentQuestion];

  return (
    <div className="quiz-play-container">
      {quiz?.musicFileName && gameState === "playing" && (
        <audio
          ref={audioRef}
          src={`/api/music/${quiz.musicFileName}`}
          autoPlay
          loop
          muted={isMuted}
          style={{ display: "none" }}
        />
      )}

      {/* Score popup */}
      {scorePopup && (
        <div className={`score-popup ${scorePopup.correct ? "correct" : "wrong"}`}>
          <div className="score-icon">
            {scorePopup.correct ? (
              <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>
            )}
          </div>
          <div className="score-text">
            {scorePopup.correct ? "Benar!" : "Salah!"}
          </div>
          {scorePopup.correct && (
            <div className="score-points">+{scorePopup.points} poin</div>
          )}
        </div>
      )}

      <div className="question-container">
        {/* Progress */}
        <div className="question-progress">
          <span className="progress-text">
            {currentQuestion + 1}/{quiz.questions.length}
          </span>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{
                width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%`,
              }}
            ></div>
          </div>
          <span className="progress-text">{score} pts</span>
        </div>

        {/* Timer */}
        <div className="timer-container">
          <div className="timer-circle">
            <svg viewBox="0 0 76 76">
              <circle className="timer-bg" cx="38" cy="38" r="34" />
              <circle
                className={`timer-progress ${timerClass}`}
                cx="38"
                cy="38"
                r="34"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <span className={`timer-text ${timeLeft <= 5 ? "danger" : ""}`}>
              {timeLeft}
            </span>
          </div>
          {quiz?.musicFileName && (
            <button
              onClick={() => setIsMuted(!isMuted)}
              style={{
                background: "rgba(255,255,255,0.2)",
                border: "none",
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                marginLeft: "1rem",
                color: "white",
                cursor: "pointer",
              }}
              title={isMuted ? "Unmute Music" : "Mute Music"}
            >
              {isMuted ? "🔇" : "🔊"}
            </button>
          )}
        </div>

        {/* Question */}
        <h2 className="question-text">{question.question}</h2>

        {/* Kahoot-style answer blocks */}
        <div className="options-container">
          {question.options.map((option, index) => {
            let optClass = "option-btn";
            if (showResult) {
              optClass += " disabled";
              if (index === question.correctAnswer) {
                optClass += " correct";
              } else if (
                index === selectedAnswer &&
                index !== question.correctAnswer
              ) {
                optClass += " wrong";
              }
            } else if (selectedAnswer === index) {
              optClass += " selected";
            }

            return (
              <button
                key={index}
                className={optClass}
                onClick={() => handleAnswer(index)}
                disabled={showResult}
              >
                <span className="option-shape">
                  {optionShapes[index]}
                </span>
                {option}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
