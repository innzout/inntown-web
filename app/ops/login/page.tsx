"use client";

import { useRouter } from "next/navigation";
import { SignIn } from "@/components/SignIn";

export default function OpsLogin() {
  const router = useRouter();
  return (
    <SignIn
      role="ops"
      title="InnTown Ops"
      points={["Watch every live order", "Approve hotels and partners", "Step in when an order is stuck"]}
      onDone={() => router.replace("/ops")}
    />
  );
}
