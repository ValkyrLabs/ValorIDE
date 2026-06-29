import * as Yup from "yup";

export const PASSWORD_POLICY_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{12,}$/;

export const PASSWORD_POLICY_DESCRIPTION =
  "Password must be at least 12 characters and include uppercase, lowercase, number, and special character.";

export const PASSWORD_REQUIRED_MESSAGE = "Password is required.";

export const PASSWORD_EXAMPLE = "ValkyrSecure-123!";

export const buildPasswordValidation = () =>
  Yup.string()
    .required(PASSWORD_REQUIRED_MESSAGE)
    .matches(PASSWORD_POLICY_PATTERN, PASSWORD_POLICY_DESCRIPTION);
