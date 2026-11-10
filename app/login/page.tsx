"use client";

import { useRouter } from "next/navigation";
import { SignIn } from "@/components/SignIn";

export default function LoginPage() {
  const router = useRouter();
  return (
    <SignIn
      role="hotel"
      title="Hotel dashboard"
      points={["Accept orders within 2 minutes", "Mark dishes sold out in one tap", "Low commission. First 30 days free"]}
      onDone={() => router.replace("/orders")}
    />
  );
}
