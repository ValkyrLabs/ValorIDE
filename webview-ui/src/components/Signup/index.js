import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/*
 * Signup Form
 */
import { Badge, Card, Col, Nav, Row } from "react-bootstrap";
import { FaHandPointUp } from "react-icons/fa";
import { FiCalendar, FiHeart, FiLock, FiUserCheck } from "react-icons/fi";
import { Link } from "react-router-dom";
import CoolButton from "@valkyr/component-library/CoolButton";
import Form from "./form";
import "./index.css";
const initialPrincipal = {
    username: "",
    password: "",
    email: "",
    createdDate: new Date(),
    lastModifiedDate: new Date(),
    roleList: [],
    authorityList: [],
};
const Signup = (props) => {
    return (_jsx("div", { style: { margin: "2em" }, children: _jsxs(Row, { children: [_jsxs(Col, { md: 3, children: [_jsx("h2", { children: "New User Account" }), _jsxs("h5", { children: ["Membership is ", _jsx(Badge, { bg: "info", children: "FREE" })] }), _jsx("br", {}), _jsx("b", { children: "Already a Member?" }), _jsx("br", {}), _jsx(Nav.Link, { children: _jsx(Link, { to: "/login", children: _jsxs(CoolButton, { variant: "dark", children: [_jsx(FiUserCheck, { size: 30 }), " Login Now"] }) }) }), _jsx("br", {}), _jsx("br", {}), _jsx("h3", { children: _jsx("i", { children: "Staying Safe" }) }), _jsx("h6", { children: _jsxs("p", { children: [_jsx(FiCalendar, { size: 20, style: { float: "left", margin: "3px" } }), "This website changes over time.", _jsx("br", {}), _jsx("br", {}), _jsx(FaHandPointUp, { size: 20, style: { float: "left", margin: "3px" } }), "When in doubt, always check for the secure lock icon in the address bar.", _jsx("br", {}), _jsx("br", {}), _jsx(FiLock, { size: 20, style: { float: "left", margin: "3px" } }), "It should be valid, from Valkyr Labs Inc in SF, California"] }) }), _jsx("br", {}), _jsx(FiHeart, { size: 28 }), " At Valkyr Labs, your privacy and security are a top priority.", _jsx("br", {}), _jsx("br", {})] }), _jsx(Col, { md: 9, children: _jsxs(Card, { style: { padding: "1em", marginBottom: "3em" }, children: [_jsxs(Card.Header, { children: [_jsxs("h4", { children: [_jsx(FiUserCheck, { size: 30 }), " Sign Up Now"] }), _jsxs("h5", { children: ["Claim your ", _jsx(Badge, { bg: "info", children: "FREE" }), " Valkyr account."] })] }), _jsxs(Card.Body, { children: [_jsx("h1", { children: "BETA Signup" }), true && _jsx(Form, {})] })] }) })] }) }));
};
export default Signup;
//# sourceMappingURL=index.js.map