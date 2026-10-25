import { Button } from "@/components/ui";
import { signOut } from "@/lib/auth/actions";
import { copy } from "@/lib/copy";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost">
        {copy.auth.signOut}
      </Button>
    </form>
  );
}
