import type { Metadata } from "next";
import { get, me, isEditor, type Quiz } from "@/lib/api";
import { PageHead, Unavailable } from "@/components/ui";
import QuizApp from "@/components/QuizApp";

export const metadata: Metadata = { title: "Learning Centre", description: "Quizzes on the life and campaigns of Lt Gen Sagat Singh, for schools and adults, with explanations and sources." };

export default async function Learn() {
  const [quiz, who] = await Promise.all([get<Quiz[]>("/api/quiz"), me()]);
  return (
    <>
      <PageHead title="Learning Centre" lead="Questions based on disputed or unverified anecdotes say so in their explanation." />
      {!quiz && <Unavailable />}
      <QuizApp all={quiz ?? []} editor={isEditor(who)} />
    </>
  );
}
