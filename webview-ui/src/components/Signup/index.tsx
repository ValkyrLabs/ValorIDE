/*
 * Signup Form
 */

import { Badge, Card, Col, Nav, Row } from "react-bootstrap";
import { FaHandPointUp } from "react-icons/fa";
import { FiCalendar, FiHeart, FiLock, FiUserCheck } from "react-icons/fi";
import { Link } from "react-router-dom";
import { Principal } from "../../thor/model";
import CoolButton from "../CoolButton";
import Form from "./form";
import "./index.css";

const initialPrincipal: Principal = {
  username: "",
  password: "",
  email: "",
  createdDate: new Date(),
  lastModifiedDate: new Date(),
  roleList: [],
};

interface SignupProps {}

const Signup: React.FC<SignupProps> = (props) => {
  return (
    <div style={{ margin: "2em" }}>
      <Row>
        <Col md={3}>
          <h2>New User Account</h2>
          <h4>
            Setup your <Badge bg="info">FREE</Badge> account
          </h4>
          <br />
          <h3>Already Have an Account?</h3>
          <Nav.Link>
            <Link to="/login">
              <CoolButton variant="dark">
                <FiUserCheck size={30} /> Login to your account
              </CoolButton>
            </Link>
          </Nav.Link>
          <br />
          <br />
        </Col>
        <Col md={6}>
          <Card style={{ padding: "1em", marginBottom: "3em" }}>
            <Card.Header>
              <h4>
                <FiUserCheck size={30} /> Sign Up Now
              </h4>
              <h5>
                Claim your <Badge bg="info">FREE</Badge> Valkyr Labs user
                account.
              </h5>
            </Card.Header>
            <Card.Body>
              <Form />
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
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
          <FiHeart size={28} /> At Valkyr Labs, our customer's privacy and
          security are a top priority. We will never SPAM you or sell your data.
          <br />
          <br />
        </Col>
      </Row>
    </div>
  );
};

export default Signup;
