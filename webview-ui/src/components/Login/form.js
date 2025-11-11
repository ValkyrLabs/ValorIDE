import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ErrorMessage, Field, Formik, } from "formik";
import { useEffect } from "react";
import { Col, Row, Spinner } from "react-bootstrap";
import { FaCheckCircle } from "react-icons/fa";
import { FiUserCheck } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import * as Yup from "yup";
// custom redux implementations go here...
import { useLoginUserMutation } from "../../redux/services/LoginService";
import CoolButton from "@valkyr/component-library/CoolButton";
import ErrorModal from "../ErrorModal";
import LoadingSpinner from "@valkyr/component-library/LoadingSpinner";
import { storeJwtToken, writeStoredPrincipal, } from "../../utils/accessControl";
import { useExtensionState } from "@/context/ExtensionStateContext";
const validationSchema = Yup.object().shape({
    username: Yup.string()
        .min(4, "User Name must be minimum 4 characters")
        .max(20, "Name must not be more than 100 characters")
        .required("User Name is required"),
});
const Form = ({ onSubmit: externalOnSubmit, isLoggedIn = false, }) => {
    const [loginUser, loginUserResult] = useLoginUserMutation();
    const navigate = useNavigate();
    const { isLoggedIn: contextLoggedIn, jwtToken } = useExtensionState();
    const loginFailed = loginUserResult.status === "rejected";
    const loginSuccess = loginUserResult.status === "fulfilled";
    if (loginSuccess) {
        // If the response contains a token, store it
        if (loginUserResult.data && loginUserResult.data.token) {
            storeJwtToken(loginUserResult.data.token, "login-form");
            const rawPrincipal = loginUserResult.data.authenticatedPrincipal;
            let parsedPrincipal = rawPrincipal;
            try {
                if (typeof rawPrincipal === "string") {
                    parsedPrincipal = JSON.parse(rawPrincipal);
                }
            }
            catch (err) {
                console.warn("Unable to parse authenticatedPrincipal", err);
                parsedPrincipal = rawPrincipal;
            }
            writeStoredPrincipal(parsedPrincipal);
        }
        // Redirect back if ?redirect= was provided
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get("redirect");
        navigate(redirect || "/dashboard");
    }
    useEffect(() => {
        if (externalOnSubmit) {
            return;
        }
        if (isLoggedIn || contextLoggedIn || jwtToken) {
            const params = new URLSearchParams(window.location.search);
            const redirect = params.get("redirect");
            navigate(redirect || "/dashboard");
        }
    }, [contextLoggedIn, externalOnSubmit, jwtToken, navigate, isLoggedIn]);
    const initialValues = {
        username: "",
        password: "",
    };
    const handleSubmit = async (values, formikHelpers) => {
        const { setSubmitting } = formikHelpers;
        try {
            if (externalOnSubmit) {
                // Use external handler (from AccountView)
                await externalOnSubmit(values, formikHelpers);
            }
            else {
                // Use internal handler (standalone usage)
                setTimeout(() => {
                    console.log(values);
                    loginUser(values);
                    setSubmitting(false);
                }, 0);
            }
        }
        catch (error) {
            console.error('Form submission error:', error);
            setSubmitting(false);
        }
    };
    return (_jsxs("div", { children: [loginSuccess && (_jsxs("div", { className: "success", children: [_jsx("h1", { children: "Success!" }), _jsx("p", { children: "Enjoy your experience..." })] })), !loginSuccess && (_jsx(Formik, { validateOnBlur: true, initialValues: initialValues, validationSchema: validationSchema, onSubmit: handleSubmit, enableReinitialize: true, children: ({ isSubmitting, errors, values, setFieldValue, resetForm, touched, setFieldTouched, handleSubmit, isValid, }) => {
                    if (loginFailed) {
                        touched = {};
                    }
                    return (_jsxs("form", { onSubmit: handleSubmit, className: "form", children: [loginFailed && (_jsx(ErrorModal, { variant: "inline", severity: "danger", title: "Login Failed", errorMessage: `"${loginUserResult?.originalArgs?.username}" could not sign in.\n${JSON.stringify(loginUserResult?.error || "Unknown error")}`, callback: () => {
                                    /* dismiss by retrying or editing fields */
                                } })), _jsx(Row, { children: _jsx(Col, { md: 12, children: _jsxs("label", { htmlFor: "username", className: "nice-form-control", children: [_jsxs("b", { children: ["User Name:", " ", touched.username && !errors.username && (_jsx("span", { className: "okCheck", children: _jsx(FaCheckCircle, {}) }))] }), _jsx(Field, { name: "username", type: "text", className: errors.username
                                                    ? "form-control field-error"
                                                    : " form-control" }), _jsx(ErrorMessage, { className: "error", name: "username", component: "div" })] }) }) }), _jsx(Row, { children: _jsx(Col, { md: 12, children: _jsxs("label", { htmlFor: "password", className: "nice-form-control", children: [_jsxs("b", { children: ["Password:", " ", touched.password && !errors.password && (_jsx("span", { className: "okCheck", children: _jsx(FaCheckCircle, {}) }))] }), _jsx(Field, { name: "password", type: "password", className: errors.password
                                                    ? "form-control field-error"
                                                    : " form-control" }), _jsx(ErrorMessage, { className: "error", name: "password", component: "div" }), _jsx("div", { style: { marginTop: 6 }, children: _jsx(Link, { to: "/forgot-password", children: "Forgot your password?" }) })] }) }) }), _jsx("br", {}), _jsx("br", {}), _jsx(Row, { children: _jsx(Col, { children: _jsxs(CoolButton, { variant: touched && isValid
                                            ? isSubmitting
                                                ? "disabled"
                                                : "success"
                                            : "info", 
                                        // disabled={!(touched && isValid && (loginUserResult.status == 'uninitialized'))}
                                        type: "submit", onClick: () => { }, children: [isSubmitting && (_jsx(Spinner, { style: { float: "left" }, as: "span", animation: "grow", variant: "light", "aria-hidden": "true" })), _jsx(FiUserCheck, { size: 30 }), " Login Now"] }) }) }), isSubmitting && (_jsx(LoadingSpinner, { size: 128, label: "Signing you in..." }))] }));
                } }))] }));
};
export default Form;
//# sourceMappingURL=form.js.map