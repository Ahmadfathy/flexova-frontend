/**
 * Thin wrapper kept for backward-compatibility.
 * New code should import PageSection directly.
 */
import React from "react";
import { PageSection } from "./PageSection";

interface CardProps {
  title?: string;
  subtitle?: string;
  className?: string;
  children?: React.ReactNode;
}

export function Card({ title, subtitle, className, children }: CardProps) {
  return (
    <PageSection title={title} subtitle={subtitle} className={className}>
      {children}
    </PageSection>
  );
}
