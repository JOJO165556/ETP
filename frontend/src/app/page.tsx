import { redirect } from "next/navigation";

// Root "/" redirects to dashboard overview or login (handled by middleware)
export default function RootPage() {
  redirect("/overview");
}
