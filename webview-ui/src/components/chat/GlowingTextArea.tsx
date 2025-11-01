import React, { forwardRef } from "react";
import DynamicTextArea from "react-textarea-autosize";
import "./ChatTextArea.css";

interface GlowingTextAreaProps extends React.ComponentProps<typeof DynamicTextArea> {
  borderState: "happy" | "waiting" | "sad";
  isStubborn: boolean;
  isExtendedThinking?: boolean;
}

const GlowingTextArea = forwardRef<HTMLTextAreaElement, GlowingTextAreaProps>(({ borderState, isStubborn, isExtendedThinking, ...props }, ref) => {
  let className = "chat-text-area";

  if (borderState === "happy") {
    className += " happy";
  } else if (borderState === "waiting") {
    className += " waiting";
  } else if (borderState === "sad") {
    className += " sad";
  }

  if (isStubborn) {
    className += " stubborn";
  }
  if (isExtendedThinking && borderState === "happy") {
    className += " extended-thinking";
  }

  return <DynamicTextArea ref={ref} className={className} {...props} />;
});

export default GlowingTextArea;
