import UserModerationProfileClient from "./UserModerationProfileClient";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ userId: "demo" }];
}

export default function UserModerationProfilePage() {
  return <UserModerationProfileClient />;
}
