import "./globals.css";

export const metadata = {
  title: "QuizMaster - Platform Quiz Interaktif",
  description:
    "Buat dan ikuti quiz interaktif secara real-time. Bergabung dengan kode undangan dan bersaing di leaderboard!",
  keywords: ["quiz", "interaktif", "real-time", "leaderboard", "edukasi"],
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
