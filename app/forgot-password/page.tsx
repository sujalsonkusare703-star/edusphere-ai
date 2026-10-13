import type { Metadata } from "next";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot password | EduSphere AI",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ForgotPasswordForm />;
}
