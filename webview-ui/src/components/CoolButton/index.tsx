import React from "react";

// import "./index.css";

/*

primary'
'secondary'
'success'
'danger'
'warning'
'info'
'light'
'dark'

*/
interface CoolButtonProps {
  disabled?: boolean;
  children: any;
  variant?: string;
  className?: string;
  onClick?: any;
  type?: any;
  size?: any;
  customStyle?: any;
}

const CoolButton: React.FC<CoolButtonProps> = ({
  disabled,
  children,
  variant,
  className,
  onClick,
  type,
  size,
  customStyle,
}) => {
  let classx = "btnx btn btn-" + variant;
  if (size === "tiny") {
    classx = "btnx btn tinyButton btn-" + variant;
  }
  if (className) {
    classx += " " + className;
  }
  return (
    <button
      style={customStyle}
      type={type}
      disabled={disabled}
      onClick={(event) => onClick(event)}
      className={classx}
    >
      {children}
    </button>
  );
};

export default CoolButton;
