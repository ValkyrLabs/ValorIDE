import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { Card, Col, Row, Alert, Form as RBForm } from "react-bootstrap";
import { Formik, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import CoolButton from "@valkyr/component-library/CoolButton";
import { usePasswordResetConfirmMutation } from "../../redux/services/LoginService";
import { FiLock } from "react-icons/fi";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
    const [resetConfirm, resetResult] = usePasswordResetConfirmMutation();
    const validationSchema = Yup.object().shape({
        newPassword: Yup.string()
            .min(8, "Minimum 8 characters")
            .required("New password is required"),
        confirmPassword: Yup.string()
            .oneOf([Yup.ref("newPassword"), undefined], "Passwords must match")
            .required("Confirm your password"),
    });
    return (_jsx("div", { style: { margin: "2em" }, children: _jsx(Row, { children: _jsx(Col, { md: { span: 8, offset: 2 }, children: _jsxs(Card, { style: { padding: "1em", marginBottom: "3em" }, children: [_jsxs(Card.Header, { children: [_jsxs("h4", { children: [_jsx(FiLock, { size: 24 }), " Reset your password"] }), _jsx("div", { children: "Enter a new password for your account." })] }), _jsxs(Card.Body, { children: [resetResult.isSuccess && (_jsxs(Alert, { variant: "success", children: ["Password reset successful. You can now", " ", _jsx(Link, { to: "/login", children: "sign in" }), "."] })), resetResult.isError && (_jsx(Alert, { variant: "danger", children: "Reset failed. Check your token or try again." })), !token && (_jsx(Alert, { variant: "warning", children: "Missing token. Use the link from your email." })), _jsx(Formik, { enableReinitialize: true, initialValues: { newPassword: "", confirmPassword: "" }, validationSchema: validationSchema, onSubmit: async (values) => {
                                        if (!token)
                                            return;
                                        await resetConfirm({
                                            token,
                                            newPassword: values.newPassword,
                                        });
                                    }, children: ({ handleSubmit, isSubmitting }) => (_jsxs("form", { onSubmit: handleSubmit, children: [_jsxs(Row, { children: [_jsxs(Col, { md: 6, children: [_jsx(RBForm.Label, { children: "New Password" }), _jsx(Field, { className: "form-control", name: "newPassword", type: "password" }), _jsx("div", { className: "text-danger", children: _jsx(ErrorMessage, { name: "newPassword" }) })] }), _jsxs(Col, { md: 6, children: [_jsx(RBForm.Label, { children: "Confirm Password" }), _jsx(Field, { className: "form-control", name: "confirmPassword", type: "password" }), _jsx("div", { className: "text-danger", children: _jsx(ErrorMessage, { name: "confirmPassword" }) })] })] }), _jsx(Row, { style: { marginTop: "1rem" }, children: _jsxs(Col, { children: [_jsx(CoolButton, { type: "submit", variant: "dark", disabled: isSubmitting || !token, children: "Update Password" }), _jsx("span", { style: { marginLeft: 12 }, children: _jsx(Link, { to: "/login", children: "Back to Login" }) })] }) })] })) })] })] }) }) }) }));
};
export default ResetPassword;
//# sourceMappingURL=ResetPassword.js.map