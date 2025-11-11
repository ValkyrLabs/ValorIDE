import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/*
 * Login Form
 */
import { Card, Col, Nav, Row } from "react-bootstrap";
import { FaHandPointUp } from "react-icons/fa";
import { FiCalendar, FiHeart, FiLock, FiUserCheck, FiUserPlus, } from "react-icons/fi";
import { Link } from "react-router-dom";
import CoolButton from "@valkyr/component-library/CoolButton";
import Form from "./form";
const initialUser = {
    username: "",
    password: "",
    email: "",
    createdDate: new Date(),
    lastModifiedDate: new Date(),
    roleList: [],
    authorityList: [],
};
const Login = (props) => {
    return (_jsxs("div", { style: { margin: "2em" }, children: [_jsxs(Row, { children: [_jsxs(Col, { md: 3, children: [_jsx("h2", { children: "Your User Account" }), _jsx("h5", { children: "Logging in is secure and fast" }), _jsx("br", {})] }), _jsx(Col, { md: 9, children: _jsxs(Card, { style: { padding: "1em", marginBottom: "3em" }, children: [_jsx(Card.Header, { children: _jsxs(Row, { children: [_jsxs(Col, { md: 9, children: [_jsxs("h4", { children: [_jsx(FiUserCheck, { size: 30 }), " Login Now"] }), _jsx("h5", { children: "Sign into your Valkyr Labs account." })] }), _jsxs(Col, { md: 3, children: [_jsx(Nav.Link, { children: _jsx(Link, { to: "/sign-up", children: _jsxs(CoolButton, { variant: "dark", children: [_jsx(FiUserPlus, { size: 30 }), " Free Signup Now"] }) }) }), _jsx("br", {}), _jsx(Nav.Link, { children: _jsx(Link, { to: "/forgot-password", children: _jsxs(CoolButton, { variant: "dark", children: [_jsx(FiUserCheck, { size: 30 }), " Reset Password"] }) }) })] })] }) }), _jsx(Card.Body, { children: _jsx(Form, {}) })] }) })] }), _jsx(Row, { children: _jsxs(Col, { md: 12, children: [_jsx("br", {}), _jsx("br", {}), _jsx("h3", { children: _jsx("i", { children: "Staying Safe" }) }), _jsx("h6", { children: _jsxs("p", { children: [_jsx(FiCalendar, { size: 20, style: { float: "left", margin: "3px" } }), "This website changes over time.", _jsx("br", {}), _jsx("br", {}), _jsx(FaHandPointUp, { size: 20, style: { float: "left", margin: "3px" } }), "When in doubt, always check for the secure lock icon in the address bar.", _jsx("br", {}), _jsx("br", {}), _jsx(FiLock, { size: 20, style: { float: "left", margin: "3px" } }), "It should be valid, from Valkyr Labs Inc in SF, California"] }) }), _jsx("br", {}), _jsx(FiHeart, { size: 28 }), " At Valkyr Labs, your privacy and security are a top priority.", _jsx("br", {}), _jsx("br", {})] }) })] }));
};
export default Login;
//# sourceMappingURL=index.js.map