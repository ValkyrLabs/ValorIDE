/*
 * Login Form
 */

import { Card, Col, Nav, Row } from "react-bootstrap";
import { FaHandPointUp } from "react-icons/fa";
import {
  FiCalendar,
  FiHeart,
  FiLock,
  FiUserCheck,
  FiUserPlus,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import { Principal } from "@thorapi/model";
// Use aurora button styles for consistency with design system
import Form from "./form";

const initialUser: Principal = {
  username: "",
  password: "",
  email: "",
  createdDate: new Date(),
  lastModifiedDate: new Date(),
  roleList: [],
  authorityList: [],
};

const Login = (props) => {
  return (
    <div style={{ margin: "2em" }}>
      <Row>
        <Col md={3}>
          <h2>Your User Account</h2>
          <h5>Logging in is secure and fast</h5>
          <br />
        </Col>
        <Col md={9}>
          <Card style={{ padding: "1em", marginBottom: "3em" }}>
            <Card.Header>
              <Row>
                <Col md={9}>
                  <h4>
                    <FiUserCheck size={30} /> Sign in
                  </h4>
                  <h5>Sign into your Valkyr Labs account.</h5>
                </Col>
                <Col md={3}>
                  <Nav.Link>
                    <Link to="/sign-up">
                      <button className="aurora-button" style={{ width: "100%" }}>
                        <FiUserPlus size={18} style={{ marginRight: 8 }} /> Free Signup
                      </button>
                    </Link>
                  </Nav.Link>
                  <br />
                  <Nav.Link>
                    <Link to="/forgot-password">
                      <button className="aurora-button" style={{ width: "100%" }}>
                        <FiUserCheck size={18} style={{ marginRight: 8 }} /> Reset
                        Password
                      </button>
                    </Link>
                  </Nav.Link>
                </Col>
              </Row>
            </Card.Header>
            <Card.Body>
              <Form />
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Row>
        <Col md={12}>
          <br />
          <br />
          <h3>
            <i>Staying Safe</i>
          </h3>
          <h6>
            <p>
              <FiCalendar size={20} style={{ float: "left", margin: "3px" }} />
              This website changes over time.
              <br />
              <br />
              <FaHandPointUp
                size={20}
                style={{ float: "left", margin: "3px" }}
              />
              When in doubt, always check for the secure lock icon in the
              address bar.
              <br />
              <br />
              <FiLock size={20} style={{ float: "left", margin: "3px" }} />
              It should be valid, from Valkyr Labs Inc in SF, California
            </p>
          </h6>
          <br />
          <FiHeart size={28} /> At Valkyr Labs, your privacy and security are a
          top priority.
          <br />
          <br />
        </Col>
      </Row>
    </div>
  );
};

export default Login;
