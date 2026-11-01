import { Button } from "@openheard/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@openheard/ui/components/dropdown-menu";
import { GearSixIcon, UserCircleIcon } from "@phosphor-icons/react";
import { Link, useLoaderData, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { DEMO_ADMIN_ID, isDemo } from "@/lib/demo";

import { Avatar } from "./bits";
import { ProfileDialog } from "./profile-dialog";

export default function UserMenu() {
  const router = useRouter();
  const data = useLoaderData({ from: "__root__" });
  const user = data?.user;
  const [profileOpen, setProfileOpen] = useState(false);
  // Ember: an email-link account starts with no name. Ask once per visit.
  useEffect(() => {
    if (!user || user.name.trim() || isDemo(data?.workspace)) return;
    try {
      if (sessionStorage.getItem("ember:asked-name")) return;
      sessionStorage.setItem("ember:asked-name", "1");
    } catch {
      // private mode: ask anyway
    }
    setProfileOpen(true);
  }, [user, data?.workspace]);

  // Nobody signs up for the demo; one click puts them in its dashboard. A
  // customer who is signed in elsewhere arrives here as a guest and needs the
  // same button.
  if (isDemo(data?.workspace) && user?.id !== DEMO_ADMIN_ID) {
    return (
      <Button variant="outline" size="sm" nativeButton={false} render={<a href="/demo" />}>
        Open dashboard
      </Button>
    );
  }

  if (!user) {
    return (
      <Link to="/login">
        <Button variant="outline" size="sm">
          Sign in
        </Button>
      </Link>
    );
  }

  return (
    <>
    <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-1 focus-visible:ring-ring">
        <Avatar name={user.name || user.email} image={user.image} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="text-[13px] font-semibold text-foreground">{user.name || "No name yet"}</div>
            <div className="truncate">{user.email}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setProfileOpen(true)}>
            <UserCircleIcon className="size-4" /> Your profile
          </DropdownMenuItem>
          {user.role === "admin" ? (
            <DropdownMenuItem render={<Link to="/dashboard/inbox" />}>
              <GearSixIcon className="size-4" /> Dashboard
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            onClick={() =>
              authClient.signOut({ fetchOptions: { onSuccess: () => router.invalidate().then(() => router.navigate({ to: "/" })) } })
            }
          >
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
    </>
  );
}
