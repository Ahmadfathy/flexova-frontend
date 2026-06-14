import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChevronDown, LogOut, User } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

interface UserChipProps {
  name?: string;
  role?: string;
  branch?: string;
  avatarUrl?: string;
}

export function UserChip({ name = "أحمد فتحي", role = "مدير", branch = "الفرع الرئيسي", avatarUrl }: UserChipProps) {
  const { t } = useTranslation("shell");
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 rounded-sm px-2 py-1 hover:bg-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="h-7 w-7">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
            <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
          </Avatar>
          <div className="hidden md:block text-start leading-tight">
            <p className="text-xs font-semibold">{name}</p>
            <p className="text-[10px] text-muted-foreground">{branch}</p>
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground hidden md:block" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52 p-2">
        <div className="px-2 py-1.5">
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-xs text-muted-foreground">{role} · {branch}</p>
        </div>
        <Separator className="my-1" />
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground">
          <User className="h-4 w-4" />
          {t("user.profile")}
        </Button>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-danger-text">
          <LogOut className="h-4 w-4" />
          {t("user.logout")}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
