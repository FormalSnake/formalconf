import React from "react";
import { Select } from "@inkjs/ui";
import { Panel } from "./layout/Panel";

interface MenuOption {
  label: string;
  value: string;
}

interface MenuProps {
  title: string;
  options: MenuOption[];
  onSelect: (value: string) => void;
}

export function Menu({ title, options, onSelect }: MenuProps) {
  return (
    <Panel title={title}>
      <Select options={options} onChange={onSelect} />
    </Panel>
  );
}
