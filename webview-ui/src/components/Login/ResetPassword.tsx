import React, { useMemo } from "react";
import { Card, Col, Row, Alert, Form as RBForm } from "react-bootstrap";
import { Formik, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import CoolButton from "@valkyr/component-library/CoolButton";
import { usePasswordResetConfirmMutation } from "../../redux/services/LoginService";
import { FiLock } from "react-icons/fi";
import { Link, useSearchParams, useNavigate } from "react-router-dom";

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [resetConfirm, resetResult] = usePasswordResetConfirmMutation();

  const validationSchema = Yup.object().shape({
    newPassword: Yup.string()
      .min(8, "Minimum 8 characters")
      .required("New password is required"),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref("newPassword"), undefined], "Passwords must match")
      .required("Confirm your password"),
  });

  return (
    <div style={{ margin: "2em" }}>
      <Row>
        <Col md={{ span: 8, offset: 2 }}>
          <Card style={{ padding: "1em", marginBottom: "3em" }}>
            <Card.Header>
              <h4>
                <FiLock size={24} /> Reset your password
              </h4>
              <div>Enter a new password for your account.</div>
            </Card.Header>
            <Card.Body>
              {resetResult.isSuccess && (
                <Alert variant="success">
                  Password reset successful. You can now{" "}
                  <Link to="/login">sign in</Link>.
                </Alert>
              )}
              {resetResult.isError && (
                <Alert variant="danger">
                  Reset failed. Check your token or try again.
                </Alert>
              )}

              {!token && (
                <Alert variant="warning">
                  Missing token. Use the link from your email.
                </Alert>
              )}

              <Formik
                enableReinitialize
                initialValues={{ newPassword: "", confirmPassword: "" }}
                validationSchema={validationSchema}
                onSubmit={async (values) => {
                  if (!token) return;
                  await resetConfirm({
                    token,
                    newPassword: values.newPassword,
                  });
                }}
              >
                {({ handleSubmit, isSubmitting }) => (
                  <form onSubmit={handleSubmit}>
                    <Row>
                      <Col md={6}>
                        <RBForm.Label>New Password</RBForm.Label>
                        <Field
                          className="form-control"
                          name="newPassword"
                          type="password"
                        />
                        <div className="text-danger">
                          <ErrorMessage name="newPassword" />
                        </div>
                      </Col>
                      <Col md={6}>
                        <RBForm.Label>Confirm Password</RBForm.Label>
                        <Field
                          className="form-control"
                          name="confirmPassword"
                          type="password"
                        />
                        <div className="text-danger">
                          <ErrorMessage name="confirmPassword" />
                        </div>
                      </Col>
                    </Row>
                    <Row style={{ marginTop: "1rem" }}>
                      <Col>
                        <CoolButton
                          type="submit"
                          variant="dark"
                          disabled={isSubmitting || !token}
                        >
                          Update Password
                        </CoolButton>
                        <span style={{ marginLeft: 12 }}>
                          <Link to="/login">Back to Login</Link>
                        </span>
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

export default ResetPassword;
