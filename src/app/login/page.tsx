import type { Metadata } from "next";
import { LoginPage } from "@/components/login/login-page";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginRoute() {
  return <LoginPage />;
}