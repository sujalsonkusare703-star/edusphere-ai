import type { Metadata } from "next";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset password | EduSphere AI",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ResetPasswordForm />;
}
