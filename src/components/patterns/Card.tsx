import React from "react";
import { cn } from "@/lib/utils";
import {
  Card as ShadCard,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

interface CardProps {
  title?: string;
  subtitle?: string;
  className?: string;
  contentClassName?: string;
  children?: React.ReactNode;
}

export function Card({ title, subtitle, className, contentClassName, children }: CardProps) {
  const hasHeader = title || subtitle;

  return (
    <ShadCard className={className}>
      {hasHeader && (
        <CardHeader>
          {title && (
            <CardTitle className="text-sm font-semibold leading-none">{title}</CardTitle>
          )}
          {subtitle && (
            <CardDescription>{subtitle}</CardDescription>
          )}
        </CardHeader>
      )}
      <CardContent className={cn(hasHeader ? "pt-0" : "p-6", contentClassName)}>
        {children}
      </CardContent>
    </ShadCard>
  );
}
