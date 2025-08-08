/*
 * Login Form
 */

import { Card, Col, Nav, Row } from "react-bootstrap"
import { FaHandPointUp } from "react-icons/fa"
import { FiCalendar, FiLock, FiUserCheck, FiUserPlus } from "react-icons/fi"
import { Link } from "react-router-dom"
import { Principal } from "../../thor/model"
import CoolButton from "../CoolButton"
import Form from "./form"
import "./index.css"

const initialUser: Principal = {
	username: "",
	password: "",
	email: "",
	createdDate: new Date(),
	lastModifiedDate: new Date(),
}

const Login = (props) => {
	return (
		<div style={{ margin: "2em" }}>
			<Row>
				<Col md={3}>
					<h2>Your User Account</h2>
					<h4>Logging in is secure and fast</h4>
					<br />
					<b>Need an Account?</b>
					<br />
					<Nav.Link>
						<Link to="/sign-up">
							<CoolButton variant="dark">
								<FiUserPlus size={30} /> Signup Now
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
								<FiUserCheck size={30} /> Login Now
							</h4>
							<h5>Sign into your Valkyr Labs account.</h5>
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
							<FaHandPointUp size={20} style={{ float: "left", margin: "3px" }} />
							When in doubt, always check for the secure lock icon in the address bar.
							<br />
							<br />
							<FiLock size={20} style={{ float: "left", margin: "3px" }} />
							It should be valid, from Valkyr Labs Inc in SF, California
						</p>
					</h6>
				</Col>
			</Row>
		</div>
	)
}

export default Login
