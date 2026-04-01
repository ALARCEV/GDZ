import type { ReactNode } from "react";

type ScreenContainerProps = {
  children: ReactNode;
};

export function ScreenContainer({ children }: ScreenContainerProps) {
  return <main className="screen-container">{children}</main>;
}
