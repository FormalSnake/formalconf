import React from "react";
import { Spinner } from "@inkjs/ui";
import { Panel } from "./layout/Panel";

interface LoadingPanelProps {
  title: string;
  label?: string;
}

export function LoadingPanel({ title, label = "Processing..." }: LoadingPanelProps) {
  return (
    <Panel title={title}>
      <Spinner label={label} />
    </Panel>
  );
}
