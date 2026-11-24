import type {ReactNode} from "react";
import CleanerShiftProvider from "@/components/providers/CleanerShiftProvider";
export default function CleanerLayout({children}:{children:ReactNode}){
  return <CleanerShiftProvider>{children}</CleanerShiftProvider>;
}
