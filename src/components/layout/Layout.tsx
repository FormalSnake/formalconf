import React from "react";
import { Box } from "ink";
import { useTerminalSize } from "../../hooks/useTerminalSize";
import { Header } from "../Header";
import { Footer } from "./Footer";
import { Breadcrumb } from "./Breadcrumb";

interface LayoutProps {
  children: React.ReactNode;
  breadcrumb?: string[];
  showFooter?: boolean;
}

export function Layout({
  children,
  breadcrumb = ["Main"],
  showFooter = true,
}: LayoutProps) {
  const { columns } = useTerminalSize();

  return (
    <Box flexDirection="column" width={columns} padding={1}>
      <Header />

      {breadcrumb.length > 1 && (
        <Box marginBottom={1} marginLeft={1}>
          <Breadcrumb path={breadcrumb} />
        </Box>
      )}

      <Box flexDirection="column" flexGrow={1}>
        {children}
      </Box>

      {showFooter && <Footer />}
    </Box>
  );
}
