import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ErrorMessage, Field, Formik, } from "formik";
import { Form as BSForm, Col, Nav, Row, Spinner } from "react-bootstrap";
import { FaCheckCircle } from "react-icons/fa";
import { FiUserCheck } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import * as Yup from "yup";
import { useAddPrincipalMutation } from "@thor/redux/services/PrincipalService";
import CoolButton from "@valkyr/component-library/CoolButton";
import "./index.css";
import { storeJwtToken, writeStoredPrincipal } from "@/utils/accessControl";
const validationSchema = Yup.object().shape({
    firstName: Yup.string()
        .min(2, "First Name must be minimum 2 characters")
        .max(100, "Name must not be more than 100 characters")
        .required("First Name is required"),
    lastName: Yup.string()
        .min(2, "Last name must be minimum 2 characters")
        .max(100, "Name must not be more than 100 characters")
        .required("Last Name is required"),
    username: Yup.string()
        .min(5, "User Name must be minimum 5 characters")
        .max(20, "Name must not be more than 100 characters")
        .required("User Name is required"),
    email: Yup.string()
        .email("Please enter a valid email address")
        .required("A valid email address is required"),
    acceptedTos: Yup.boolean()
        .required("The terms of service must be accepted to continue.")
        .oneOf([true], "The terms of service must be accepted to continue."),
    password: Yup.string()
        .matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/, "Password must contain a lowercase character, an uppercase character, and a number")
        .required()
        .min(8, "Password must be at least 8 characters"),
});
const BetaSignup = () => {
    const [addPrincipal, addPrincipalResult] = useAddPrincipalMutation();
    const navigate = useNavigate();
    // If we got an error, and the mutation is in "rejected" status,
    // principalExists is basically a quick way to check an error was thrown
    const principalExists = addPrincipalResult.error?.status === 400 &&
        addPrincipalResult.status === "rejected";
    // alert(JSON.stringify(addPrincipalResult));
    const signupSuccess = addPrincipalResult.status === "fulfilled";
    let existingPrincipalName = null;
    if (principalExists) {
        // This means the server rejected the request
        // so store the attempted username in a local variable
        existingPrincipalName = addPrincipalResult.originalArgs.username;
    }
    const initialValues = {
        token: "",
        username: "",
        password: "",
    };
    const handleSubmit = async (values, { setSubmitting }) => {
        setSubmitting(true);
        try {
            // Attempt to create the Principal
            const response = await addPrincipal(values).unwrap();
            // If the response contains auth, persist it for downstream flows
            const respAny = response;
            if (respAny?.token) {
                storeJwtToken(respAny.token, "signup-beta");
            }
            if (respAny?.authenticatedPrincipal) {
                let principalPayload = respAny.authenticatedPrincipal;
                if (typeof principalPayload === "string") {
                    try {
                        principalPayload = JSON.parse(principalPayload);
                    }
                    catch {
                        principalPayload = undefined;
                    }
                }
                if (principalPayload) {
                    writeStoredPrincipal(principalPayload);
                }
            }
            navigate("/login");
        }
        catch (error) {
            // We can do additional error handling here if needed
            console.error("Error during signup:", error);
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsxs("div", { children: [signupSuccess && (_jsxs("div", { className: "success", children: [_jsx("h1", { children: "Success!" }), _jsx("p", { children: "Your account has been created. Please check your email for a verification link." }), _jsx(Link, { to: "/login", children: "Click here to Sign In" }), _jsx("br", {}), _jsx("br", {}), _jsx("br", {})] })), false && (_jsx(Formik, { validateOnBlur: true, initialValues: initialValues, validationSchema: validationSchema, onSubmit: handleSubmit, enableReinitialize: true, children: ({ isSubmitting, errors, values, setFieldValue, resetForm, touched, setFieldTouched, handleSubmit, isValid, }) => {
                    // If the RTK call was rejected with a 400 error, we can set the username field error
                    if (principalExists) {
                        //  alert(addPrincipalResult.error)
                        // Double-check if user attempted the same username
                        if (existingPrincipalName === values.username) {
                            // Check if there's a 400 error from our server
                            const maybeError = addPrincipalResult.error;
                            const isBadRequest = maybeError?.originalStatus === 400;
                            if (isBadRequest) {
                                // We'll assume the server included something in `maybeError.data`.
                                // If not, we can just provide a fallback message.
                                errors.username =
                                    maybeError.data || "Username is invalid or already taken.";
                            }
                        }
                        else {
                            // If the user changed the username, let's free them to submit again
                            isSubmitting = false;
                            isValid = true;
                        }
                    }
                    return (_jsxs("form", { onSubmit: handleSubmit, className: "form", children: [_jsx(Row, { children: _jsx(Col, { md: 12, children: _jsxs("label", { htmlFor: "firstName", className: "nice-form-control", children: [_jsxs("b", { children: ["First Name:", touched.firstName && !errors.firstName && (_jsxs("span", { className: "okCheck", children: [_jsx(FaCheckCircle, {}), " looks good!"] }))] }), _jsx(Field, { name: "firstName", type: "text", className: errors.firstName
                                                    ? "form-control field-error"
                                                    : "nice-form-control form-control" }), _jsx(ErrorMessage, { className: "error", name: "firstName", component: "span" })] }) }) }), _jsx(Row, { children: _jsx(Col, { md: 12, children: _jsxs("label", { htmlFor: "lastName", className: "nice-form-control", children: [_jsxs("b", { children: ["Last Name:", touched.lastName && !errors.lastName && (_jsxs("span", { className: "okCheck", children: [_jsx(FaCheckCircle, {}), " looks good!"] }))] }), _jsx(Field, { name: "lastName", type: "text", className: errors.lastName
                                                    ? "form-control field-error"
                                                    : "form-control" }), _jsx(ErrorMessage, { className: "error", name: "lastName", component: "div" })] }) }) }), _jsx(Row, { children: _jsxs(Col, { md: 12, children: [existingPrincipalName === values.username &&
                                            principalExists && (_jsxs("div", { className: "error", children: ["\"", addPrincipalResult.originalArgs.username, "\" is unavailable.", _jsx("br", {})] })), _jsxs("label", { htmlFor: "username", className: "nice-form-control", children: [_jsxs("b", { children: ["User Name:", touched.username && !errors.username && (_jsxs("span", { className: "okCheck", children: [_jsx(FaCheckCircle, {}), " looks good!"] }))] }), _jsx(Field, { name: "username", type: "text", className: errors.username
                                                        ? "form-control field-error"
                                                        : "form-control" }), _jsx(ErrorMessage, { className: "error", name: "username", component: "div" })] })] }) }), _jsx(Row, { children: _jsx(Col, { md: 12, children: _jsxs("label", { htmlFor: "email", className: "nice-form-control", children: [_jsxs("b", { children: ["Email:", touched.email && !errors.email && (_jsxs("span", { className: "okCheck", children: [_jsx(FaCheckCircle, {}), " looks good!"] }))] }), _jsx(Field, { name: "email", type: "text", className: errors.email
                                                    ? "form-control field-error"
                                                    : "form-control" }), _jsx(ErrorMessage, { className: "error", name: "email", component: "div" })] }) }) }), _jsx(Row, { children: _jsx(Col, { md: 12, children: _jsxs("label", { htmlFor: "password", className: "nice-form-control", children: [_jsxs("b", { children: ["Password:", touched.password && !errors.password && (_jsxs("span", { className: "okCheck", children: [_jsx(FaCheckCircle, {}), " looks good!"] }))] }), _jsx(Field, { name: "password", type: "password", className: errors.password
                                                    ? "form-control field-error"
                                                    : "form-control" }), _jsx(ErrorMessage, { className: "error", name: "password", component: "div" })] }) }) }), _jsx(Row, { children: _jsx(Col, { md: 12, children: _jsxs("label", { htmlFor: "acceptedTos", className: "nice-form-control", children: [touched.acceptedTos && !errors.acceptedTos && (_jsxs("span", { className: "okCheck", children: [_jsx(FaCheckCircle, {}), " ", _jsx("b", { children: "thank you!" })] })), "I have read and agree to the", _jsx("b", { children: _jsx(Nav.Link, { href: "https://valkyrlabs.com/v1/docs/Legal/tos", target: "_blank", children: "\u00A0Terms of Service (Click here to read TOS)" }) }), _jsx("h1", { children: _jsx(BSForm.Check, { required: true, id: "acceptedTos", name: "acceptedTos", onChange: (e) => {
                                                        setFieldTouched("acceptedTos", true);
                                                        setFieldValue("acceptedTos", e.target.checked);
                                                    }, isInvalid: !!errors.acceptedTos, className: errors.acceptedTos ? "errorCheck" : "" }) }), _jsx(ErrorMessage, { className: "error", name: "acceptedTos", component: "div" }), " "] }) }) }), _jsx("br", {}), _jsx("br", {}), _jsx(Row, { children: _jsx(Col, { md: 12, children: _jsxs(CoolButton, { variant: touched && isValid
                                            ? isSubmitting
                                                ? "disabled"
                                                : "success"
                                            : "warning", type: "submit", onClick: () => { }, children: [isSubmitting && (_jsx(Spinner, { style: { float: "left" }, as: "span", animation: "grow", variant: "light", "aria-hidden": "true" })), _jsx(FiUserCheck, { size: 30 }), "Pre-Register for BETA USER Account"] }) }) })] }));
                } }))] }));
};
export default BetaSignup;
//# sourceMappingURL=BetaSignup.js.map