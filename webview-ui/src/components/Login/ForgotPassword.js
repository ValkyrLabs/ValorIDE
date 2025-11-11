import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, Col, Row, Alert, Form as RBForm } from "react-bootstrap";
import { Formik, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import CoolButton from "@valkyr/component-library/CoolButton";
import { usePasswordResetRequestMutation, useLookupUsernameMutation, } from "../../redux/services/LoginService";
import { FiMail, FiUser } from "react-icons/fi";
import { Link } from "react-router-dom";
const validationSchema = Yup.object()
    .shape({
    email: Yup.string().email("Enter a valid email").notRequired(),
    phoneNumber: Yup.string().notRequired(),
})
    .test("email-or-phone", "Enter email or phone number", (value) => {
    return Boolean(value?.email || value?.phoneNumber);
});
const ForgotPassword = () => {
    const [resetRequest, resetResult] = usePasswordResetRequestMutation();
    const [lookupUsername, lookupResult] = useLookupUsernameMutation();
    return (_jsx("div", { style: { margin: "2em" }, children: _jsx(Row, { children: _jsx(Col, { md: { span: 8, offset: 2 }, children: _jsxs(Card, { style: { padding: "1em", marginBottom: "3em" }, children: [_jsxs(Card.Header, { children: [_jsxs("h4", { children: [_jsx(FiMail, { size: 24 }), " Forgot your password?"] }), _jsx("div", { children: "We\u2019ll send reset instructions if the account exists." })] }), _jsxs(Card.Body, { children: [resetResult.isSuccess && (_jsx(Alert, { variant: "success", children: "If the account exists, instructions were sent." })), resetResult.isError && (_jsx(Alert, { variant: "warning", children: "We could not process that request. Try again." })), _jsx(Formik, { initialValues: { email: "", phoneNumber: "" }, validationSchema: validationSchema, onSubmit: (values) => resetRequest(values), children: ({ handleSubmit, isSubmitting, values }) => (_jsxs("form", { onSubmit: handleSubmit, children: [_jsxs(Row, { children: [_jsxs(Col, { md: 6, children: [_jsx(RBForm.Label, { children: "Email" }), _jsx(Field, { className: "form-control", name: "email", type: "email", placeholder: "you@example.com" }), _jsx("div", { className: "text-danger", children: _jsx(ErrorMessage, { name: "email" }) })] }), _jsxs(Col, { md: 6, children: [_jsx(RBForm.Label, { children: "Phone (optional)" }), _jsx(Field, { className: "form-control", name: "phoneNumber", type: "text", placeholder: "+12345551234" }), _jsx("div", { className: "text-danger", children: _jsx(ErrorMessage, { name: "phoneNumber" }) })] })] }), _jsx(Row, { style: { marginTop: "1rem" }, children: _jsxs(Col, { children: [_jsx(CoolButton, { type: "submit", variant: "dark", disabled: isSubmitting, children: "Send Reset Instructions" }), _jsx("span", { style: { marginLeft: 12 }, children: _jsx(Link, { to: "/login", children: "Back to Login" }) })] }) })] })) }), _jsx("hr", {}), _jsxs("h5", { children: [_jsx(FiUser, { size: 20 }), " Forgot username?"] }), _jsx(Formik, { initialValues: { email: "", phoneNumber: "" }, validationSchema: validationSchema, onSubmit: (values) => lookupUsername(values), children: ({ handleSubmit, isSubmitting }) => (_jsxs("form", { onSubmit: handleSubmit, children: [_jsxs(Row, { children: [_jsxs(Col, { md: 6, children: [_jsx(RBForm.Label, { children: "Email" }), _jsx(Field, { className: "form-control", name: "email", type: "email" })] }), _jsxs(Col, { md: 6, children: [_jsx(RBForm.Label, { children: "Phone (optional)" }), _jsx(Field, { className: "form-control", name: "phoneNumber", type: "text" })] })] }), _jsx(Row, { style: { marginTop: "1rem" }, children: _jsxs(Col, { children: [_jsx(CoolButton, { type: "submit", variant: "outline-dark", disabled: isSubmitting, children: "Lookup Username" }), lookupResult.isSuccess &&
                                                            lookupResult.data?.username && (_jsxs("span", { style: { marginLeft: 12 }, children: ["Username: ", lookupResult.data.username] }))] }) })] })) })] })] }) }) }) }));
};
export default ForgotPassword;
//# sourceMappingURL=ForgotPassword.js.map