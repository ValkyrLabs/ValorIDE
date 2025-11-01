/*
 * Signup Form
 */

import { Badge, Card, Col, Nav, Row } from "react-bootstrap";
import { FaHandPointUp } from "react-icons/fa";
import { FiCalendar, FiHeart, FiLock, FiUserCheck } from "react-icons/fi";

import { Link } from "react-router-dom";
import { Principal } from "@thor/model";
import CoolButton from "@valkyr/component-library/CoolButton";
import Form from "./form";
import "./index.css";

const initialPrincipal: Principal = {
  username: "",
  password: "",
  email: "",
  createdDate: new Date(),
  lastModifiedDate: new Date(),
  roleList: [],
  authorityList: [],
};

const Signup = (props) => {
  return (
    <div style={{ margin: "2em" }}>
      <Row>
        <Col md={3}>
          <h2>New User Account</h2>
          <h5>
            Membership is <Badge bg="info">FREE</Badge>
          </h5>
          <br />
          <b>Already a Member?</b>
          <br />
          <Nav.Link>
            <Link to="/login">
              <CoolButton variant="dark">
                <FiUserCheck size={30} /> Login Now
              </CoolButton>
            </Link>
          </Nav.Link>
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

        <Col md={9}>
          <Card style={{ padding: "1em", marginBottom: "3em" }}>
            <Card.Header>
              <h4>
                <FiUserCheck size={30} /> Sign Up Now
              </h4>
              <h5>
                Claim your <Badge bg="info">FREE</Badge> Valkyr account.
              </h5>
            </Card.Header>
            <Card.Body>
              <h1>BETA Signup</h1>
              {true && <Form />}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Signup;
