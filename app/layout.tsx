import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Correge — Banco de Questões",
  description:
    "Gerencie e classifique seu acervo de perguntas para criação ágil de testes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
