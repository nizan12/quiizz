"use client";

import { useState, useEffect, useCallback, useRef, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  db,
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from "@/lib/firebase";
import { sfx } from "@/lib/sounds";
import { getPixelbotUrl } from "@/lib/avatar";

export default function QuizPlayPage({ params }) {
  const { code } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const playerName = searchParams.get("name") || "Anonim";
  const playerNim = searchParams.get("nim") || "";
  const playerAvatar = searchParams.get("avatar") || "Alpha";

  const [quizId, setQuizId] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [participantId, setParticipantId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [gameState, setGameState] = useState("loading");
  const [scorePopup, setScorePopup] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isBlurred, setIsBlurred] = useState(false);
  const [warningToast, setWarningToast] = useState(null);
  const [participantsList, setParticipantsList] = useState([]);
  const [floatingReactions, setFloatingReactions] = useState([]);
  const clientIdRef = useRef(null);
  if (!clientIdRef.current) {
    clientIdRef.current = "client_" + Math.random().toString(36).substring(2, 10);
  }
  const toastTimeoutRef = useRef(null);
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
        const storedParticipantId = localStorage.getItem(sessionKey);

        if (storedParticipantId) {
          setParticipantId(storedParticipantId);
          
          // Restore progress to prevent restarting or going back
          const pDocRef = doc(db, "quizzes", quizDoc.id, "participants", storedParticipantId);
          const pDoc = await getDoc(pDocRef);
          
          if (pDoc.exists()) {
            const pData = pDoc.data();
            const previousAnswers = pData.answers || [];
            setAnswers(previousAnswers);
            setScore(pData.score || 0);
            
            if (previousAnswers.length >= quizData.questions?.length) {
              setGameState("finished");
              return; // Stop further execution since they already finished
            } else {
              setCurrentQuestion(previousAnswers.length);
            }
          }
        } else {
          const participantRef = await addDoc(
            collection(db, "quizzes", quizDoc.id, "participants"),
            {
              name: playerName,
              nim: playerNim,
              avatar: playerAvatar,
              score: 0,
              streak: 0,
              answers: [],
              joinedAt: serverTimestamp(),
            }
          );
          setParticipantId(participantRef.id);
          localStorage.setItem(sessionKey, participantRef.id);
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

  // Real-time participants listener for waiting lobby
  useEffect(() => {
    if (!quizId) return;
    const unsub = onSnapshot(
      collection(db, "quizzes", quizId, "participants"),
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setParticipantsList(list);
      }
    );
    return () => unsub();
  }, [quizId]);

  // Real-time floating reactions listener (synchronized across all participants)
  useEffect(() => {
    if (!quizId) return;

    const listenerStartTime = Date.now() - 1000;
    const reactionsRef = collection(db, "quizzes", quizId, "reactions");
    const q = query(reactionsRef, where("timestamp", ">", listenerStartTime));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            // Only trigger if sent by another participant
            if (data.senderId !== clientIdRef.current) {
              const id = change.doc.id || String(Date.now() + Math.random());
              const emoji = data.emoji;
              const left = data.left ?? (Math.random() * 60 + 20);

              setFloatingReactions((prev) => [...prev, { id, emoji, left }]);
              setTimeout(() => {
                setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
              }, 2000);
            }
          }
        });
      },
      (err) => {
        console.warn("Reactions listener error:", err);
      }
    );

    return () => unsub();
  }, [quizId]);

  // Floating reaction helper (instant local + broadcast to all other players)
  const sendReaction = async (emoji) => {
    sfx.playTick();
    const id = "local_" + Date.now() + "_" + Math.random();
    const left = Math.random() * 60 + 20;

    // 1. Instant local animation
    setFloatingReactions((prev) => [...prev, { id, emoji, left }]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2000);

    // 2. Broadcast to Firestore so all other participants in the waiting room see it
    if (!quizId) return;
    try {
      const docRef = await addDoc(collection(db, "quizzes", quizId, "reactions"), {
        emoji,
        left,
        timestamp: Date.now(),
        senderId: clientIdRef.current,
      });

      // 3. Clean up Firestore document after 4 seconds
      setTimeout(() => {
        deleteDoc(doc(db, "quizzes", quizId, "reactions", docRef.id)).catch(() => {});
      }, 4000);
    } catch (err) {
      console.error("Failed to broadcast reaction:", err);
    }
  };

  // Synchronize audio playback
  useEffect(() => {
    if (gameState === "playing" && audioRef.current) {
      const audio = audioRef.current;
      
      const syncAudio = () => {
        if (quiz?.startedAt) {
          const elapsed = (Date.now() - quiz.startedAt) / 1000;
          const duration = audio.duration;
          if (duration > 0 && isFinite(duration)) {
            audio.currentTime = elapsed % duration;
          }
        }
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            if (err.name === "AbortError" || err.name === "NotAllowedError") {
              // Benign browser behavior when interrupted by load/pause or autoplay policy
              return;
            }
            console.warn("Audio play warning:", err);
          });
        }
      };

      if (audio.readyState >= 1) { // HAVE_METADATA
        syncAudio();
      } else {
        audio.addEventListener("loadedmetadata", syncAudio, { once: true });
        return () => audio.removeEventListener("loadedmetadata", syncAudio);
      }
    }
  }, [gameState, quiz?.startedAt]);

  // Countdown timer with SFX
  useEffect(() => {
    if (gameState !== "playing" || showResult) return;

    if (timeLeft <= 0) {
      handleTimeUp();
      return;
    }

    if (timeLeft <= 5 && !isMuted) {
      sfx.playTick();
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, gameState, showResult, isMuted]);

  // Helper to trigger stylish anti-cheat toast notification
  const triggerWarning = useCallback((msg) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setWarningToast(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setWarningToast(null);
    }, 2800);
  }, []);

  // Helper to clear clipboard securely
  const clearClipboard = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText("Aksi screenshot & salin diblokir.").catch(() => {});
    }
  }, []);

  // Comprehensive Anti-cheat mechanisms (anti-screenshot, anti-copy, anti-print, devtools block)
  useEffect(() => {
    if (gameState !== "playing") return;

    const handleContextMenu = (e) => {
      e.preventDefault();
      triggerWarning("Klik kanan dinonaktifkan demi integritas quiz.");
      return false;
    };

    const handleSelectStart = (e) => {
      e.preventDefault();
      return false;
    };

    const handleDragStart = (e) => {
      e.preventDefault();
      return false;
    };

    const handleCopy = (e) => {
      e.preventDefault();
      clearClipboard();
      triggerWarning("Aksi salin (copy) teks dilarang selama quiz berlangsung.");
      return false;
    };

    const handleCut = (e) => {
      e.preventDefault();
      clearClipboard();
      triggerWarning("Aksi potong (cut) teks dilarang.");
      return false;
    };

    const handlePaste = (e) => {
      e.preventDefault();
      return false;
    };

    const handleKeyDown = (e) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      const key = e.key ? e.key.toLowerCase() : "";

      // PrintScreen Key detection
      if (e.key === "PrintScreen" || e.code === "PrintScreen") {
        e.preventDefault();
        clearClipboard();
        setIsBlurred(true);
        triggerWarning("Aksi tangkapan layar (Screenshot) diblokir!");
        return;
      }

      // Block Ctrl+C, Ctrl+X, Ctrl+A, Ctrl+U, Ctrl+S, Ctrl+P
      if (isCtrl && ["c", "x", "a", "u", "s", "p"].includes(key)) {
        e.preventDefault();
        if (key === "c" || key === "x" || key === "a") {
          clearClipboard();
          triggerWarning("Shortcut salin / seleksi teks dinonaktifkan.");
        } else if (key === "p") {
          triggerWarning("Mencetak halaman (Print) diblokir.");
        } else if (key === "s") {
          triggerWarning("Menyimpan halaman diblokir.");
        } else if (key === "u") {
          triggerWarning("Melihat source code diblokir.");
        }
        return false;
      }

      // Block DevTools shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+Shift+S)
      if (
        e.key === "F12" ||
        (isCtrl && e.shiftKey && ["i", "j", "c", "s"].includes(key))
      ) {
        e.preventDefault();
        triggerWarning("Developer Tools / Snip shortcut diblokir.");
        return false;
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === "PrintScreen" || e.code === "PrintScreen") {
        clearClipboard();
        setIsBlurred(true);
        triggerWarning("Aksi tangkapan layar (Screenshot) diblokir!");
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearClipboard();
        setIsBlurred(true);
      }
    };

    const handleBlur = () => {
      clearClipboard();
      setIsBlurred(true);
    };

    const handleFocus = () => {
      // Focus regained
      setIsBlurred(false);
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("selectstart", handleSelectStart);
    document.addEventListener("dragstart", handleDragStart);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("cut", handleCut);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("selectstart", handleSelectStart);
      document.removeEventListener("dragstart", handleDragStart);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [gameState, triggerWarning, clearClipboard]);

  const handleTimeUp = useCallback(() => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(-1);
    setIsCorrect(false);
    setShowResult(true);
    setStreak(0);
    if (!isMuted) {
      sfx.playWrong();
    }
    setScorePopup({ correct: false, points: 0, streak: 0 });

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
  }, [selectedAnswer, currentQuestion, quiz, isMuted]);

  const handleAnswer = (optionIndex) => {
    if (selectedAnswer !== null || showResult) return;

    const question = quiz.questions[currentQuestion];
    const correct = optionIndex === question.correctAnswer;
    const timeTaken = (quiz.timePerQuestion || 30) - timeLeft;
    const points = correct ? Math.max(question.points, 1) : 0;
    const speedBonus = correct
      ? Math.round((timeLeft / (quiz.timePerQuestion || 30)) * 5)
      : 0;

    let newStreak = streak;
    let streakBonus = 0;

    if (correct) {
      newStreak = streak + 1;
      streakBonus = newStreak >= 2 ? Math.min((newStreak - 1) * 2, 8) : 0;
      setStreak(newStreak);
      if (!isMuted) {
        if (newStreak >= 3) {
          sfx.playStreak();
        } else {
          sfx.playCorrect();
        }
      }
    } else {
      newStreak = 0;
      setStreak(0);
      if (!isMuted) {
        sfx.playWrong();
      }
    }

    const totalPoints = points + speedBonus + streakBonus;

    setSelectedAnswer(optionIndex);
    setIsCorrect(correct);
    setShowResult(true);
    setScorePopup({
      correct,
      points: totalPoints,
      streak: newStreak,
      streakBonus,
    });

    const newScore = score + totalPoints;
    setScore(newScore);

    const newAnswer = {
      questionId: currentQuestion,
      selected: optionIndex,
      correct,
      timeTaken,
      streak: newStreak,
    };
    setAnswers((prev) => [...prev, newAnswer]);

    if (participantId && quizId) {
      updateDoc(doc(db, "quizzes", quizId, "participants", participantId), {
        score: newScore,
        streak: newStreak,
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

  // Waiting room (Interactive Lobby)
  if (gameState === "waiting") {
    return (
      <div className="quiz-play-container protected-content">
        {/* Floating Reactions */}
        {floatingReactions.map((r) => (
          <div
            key={r.id}
            className="floating-reaction-item"
            style={{ left: `${r.left}%` }}
          >
            {r.emoji}
          </div>
        ))}

        <div className="lobby-card animate-scale-in">
          <div className="lobby-count-badge">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle", marginRight: "6px" }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>{participantsList.length} Peserta Sudah Masuk</span>
          </div>

          <h1 style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>
            {quiz?.title || "Quiz"}
          </h1>
          <p style={{ opacity: 0.8, fontSize: "0.95rem" }}>
            Menunggu Host / Admin memulai kuis...
          </p>

          {/* Current player spotlight */}
          <div
            style={{
              margin: "1.25rem auto 0.5rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              background: "rgba(255,255,255,0.15)",
              padding: "8px 20px",
              borderRadius: "var(--radius-full)",
            }}
          >
            <img
              src={getPixelbotUrl(playerAvatar)}
              alt={playerName}
              width="38"
              height="38"
              style={{ borderRadius: "50%", background: "rgba(255,255,255,0.2)" }}
            />
            <span style={{ fontWeight: 800, fontSize: "1.05rem" }}>
              {playerName}
            </span>
            {playerNim && (
              <span style={{ opacity: 0.7, fontSize: "0.85rem" }}>
                ({playerNim})
              </span>
            )}
          </div>

          {/* Participants chips grid */}
          <div className="lobby-players-grid">
            {participantsList.map((p) => {
              const isMe = p.id === participantId || p.name === playerName;
              return (
                <div
                  key={p.id}
                  className={`player-chip ${isMe ? "is-me" : ""}`}
                >
                  <img
                    src={getPixelbotUrl(p.avatar)}
                    alt={p.name}
                    width="26"
                    height="26"
                    style={{ borderRadius: "50%", background: "rgba(255,255,255,0.2)" }}
                  />
                  <span>{p.name}</span>
                  {isMe && <span className="you-tag">Kamu</span>}
                </div>
              );
            })}
          </div>

          {/* Reaction buttons */}
          <p
            style={{
              fontSize: "0.8rem",
              opacity: 0.7,
              marginBottom: "0.5rem",
            }}
          >
            Kirim reaksi emoji ke layar:
          </p>
          <div className="reaction-bar-container">
            {["👏", "🔥", "❤️", "🎉", "😎", "🚀"].map((em) => (
              <button
                key={em}
                className="reaction-btn"
                type="button"
                onClick={() => sendReaction(em)}
              >
                {em}
              </button>
            ))}
          </div>

          <div className="waiting-dots" style={{ marginTop: "1.5rem" }}>
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
    <div className="quiz-play-container protected-content">
      {/* Anti-cheat Shield Overlay */}
      {isBlurred && (
        <div
          className="anti-cheat-overlay"
          onClick={() => setIsBlurred(false)}
        >
          <div className="anti-cheat-card" onClick={(e) => e.stopPropagation()}>
            <div className="anti-cheat-icon-circle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="40" height="40">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <div>
              <h2 style={{ color: "#FFFFFF", fontSize: "1.4rem", marginBottom: "0.5rem" }}>
                Layar Diamankan
              </h2>
              <p style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "0.95rem", lineHeight: 1.5 }}>
                Tangkapan layar (screenshot) dan perpindahan aplikasi dicegah demi kejujuran quiz.
              </p>
            </div>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => {
                setIsBlurred(false);
                window.focus();
              }}
              style={{ width: "100%", marginTop: "0.5rem" }}
            >
              Kembali ke Quiz
            </button>
          </div>
        </div>
      )}

      {/* Floating Warning Toast */}
      {warningToast && (
        <div className="anti-cheat-toast">
          <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
            <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 10h2v4h-2zm0 6h2v2h-2z" />
          </svg>
          <span>{warningToast}</span>
        </div>
      )}

      {quiz?.musicFileName && gameState === "playing" && (
        <audio
          ref={audioRef}
          src={quiz.musicFileName.startsWith("http") ? quiz.musicFileName : `/music/${quiz.musicFileName}`}
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
          {scorePopup.streak >= 2 && (
            <div className="streak-badge-popup">
              🔥 {scorePopup.streak}x STREAK! (+{scorePopup.streakBonus} Bonus Pts)
            </div>
          )}
        </div>
      )}

      <div className={`question-container ${isBlurred ? "content-shielded" : ""}`}>
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
              {isMuted ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                  <line x1="12" y1="19" x2="12" y2="23"></line>
                  <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
              )}
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
