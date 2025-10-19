import React from "react";
import { Card, Col, Row, Alert, Form as RBForm } from "react-bootstrap";
import { Formik, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import CoolButton from "@valkyr/component-library/CoolButton";
import {
  usePasswordResetRequestMutation,
  useLookupUsernameMutation,
} from "../../redux/services/LoginService";
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

const ForgotPassword: React.FC = () => {
  const [resetRequest, resetResult] = usePasswordResetRequestMutation();
  const [lookupUsername, lookupResult] = useLookupUsernameMutation();

  return (
    <div style={{ margin: "2em" }}>
      <Row>
        <Col md={{ span: 8, offset: 2 }}>
          <Card style={{ padding: "1em", marginBottom: "3em" }}>
            <Card.Header>
              <h4>
                <FiMail size={24} /> Forgot your password?
              </h4>
              <div>We’ll send reset instructions if the account exists.</div>
            </Card.Header>
            <Card.Body>
              {resetResult.isSuccess && (
                <Alert variant="success">
                  If the account exists, instructions were sent.
                </Alert>
              )}
              {resetResult.isError && (
                <Alert variant="warning">
                  We could not process that request. Try again.
                </Alert>
              )}

              <Formik
                initialValues={{ email: "", phoneNumber: "" }}
                validationSchema={validationSchema}
                onSubmit={(values) => resetRequest(values)}
              >
                {({ handleSubmit, isSubmitting, values }) => (
                  <form onSubmit={handleSubmit}>
                    <Row>
                      <Col md={6}>
                        <RBForm.Label>Email</RBForm.Label>
                        <Field
                          className="form-control"
                          name="email"
                          type="email"
                          placeholder="you@example.com"
                        />
                        <div className="text-danger">
                          <ErrorMessage name="email" />
                        </div>
                      </Col>
                      <Col md={6}>
                        <RBForm.Label>Phone (optional)</RBForm.Label>
                        <Field
                          className="form-control"
                          name="phoneNumber"
                          type="text"
                          placeholder="+12345551234"
                        />
                        <div className="text-danger">
                          <ErrorMessage name="phoneNumber" />
                        </div>
                      </Col>
                    </Row>

                    <Row style={{ marginTop: "1rem" }}>
                      <Col>
                        <CoolButton
                          type="submit"
                          variant="dark"
                          disabled={isSubmitting}
                        >
                          Send Reset Instructions
                        </CoolButton>
                        <span style={{ marginLeft: 12 }}>
                          <Link to="/login">Back to Login</Link>
                        </span>
                      </Col>
                    </Row>
                  </form>
                )}
              </Formik>

              <hr />
              <h5>
                <FiUser size={20} /> Forgot username?
              </h5>
              <Formik
                initialValues={{ email: "", phoneNumber: "" }}
                validationSchema={validationSchema}
                onSubmit={(values) => lookupUsername(values)}
              >
                {({ handleSubmit, isSubmitting }) => (
                  <form onSubmit={handleSubmit}>
                    <Row>
                      <Col md={6}>
                        <RBForm.Label>Email</RBForm.Label>
                        <Field
                          className="form-control"
                          name="email"
                          type="email"
                        />
                      </Col>
                      <Col md={6}>
                        <RBForm.Label>Phone (optional)</RBForm.Label>
                        <Field
                          className="form-control"
                          name="phoneNumber"
                          type="text"
                        />
                      </Col>
                    </Row>
                    <Row style={{ marginTop: "1rem" }}>
                      <Col>
                        <CoolButton
                          type="submit"
                          variant="outline-dark"
                          disabled={isSubmitting}
                        >
                          Lookup Username
                        </CoolButton>
                        {lookupResult.isSuccess &&
                          lookupResult.data?.username && (
                            <span style={{ marginLeft: 12 }}>
                              Username: {lookupResult.data.username}
                            </span>
                          )}
                      </Col>
                    </Row>
                  </form>
                )}
              </Formik>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ForgotPassword;
