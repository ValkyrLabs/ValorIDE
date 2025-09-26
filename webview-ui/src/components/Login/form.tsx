import { ErrorMessage, Field, Formik, FormikHelpers } from "formik";
import React from "react";
import { Col, Row, Spinner } from "react-bootstrap";
import { FaCheckCircle } from "react-icons/fa";
import { FiUserCheck } from "react-icons/fi";
import * as Yup from "yup";
import { Login } from "@thor/model";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import "./index.css";

const validationSchema = Yup.object().shape({
  username: Yup.string()
    .min(4, "User Name must be minimum 4 characters")
    .max(20, "Name must not be more than 100 characters")
    .required("User Name is required"),
});

interface FormProps {
  onSubmit: (values: Login, helpers: FormikHelpers<Login>) => void;
  isLoggedIn?: boolean;
  onLogout?: () => void;
}

const Form: React.FC<FormProps> = ({ onSubmit, isLoggedIn, onLogout }) => {
  const initialValues: Login = {
    username: "",
    password: "",
  };

  return (
    <div>
      {isLoggedIn && (
        <div style={{ marginBottom: "1em" }}>
          <VSCodeButton className="glow-button waiting" onClick={onLogout} type="button" style={{ marginRight: "1em" }}>
            Logout
          </VSCodeButton>
          <span style={{ fontWeight: "bold", marginLeft: "1em" }}>or: Switch Users</span>
        </div>
      )}
      <Formik
        validateOnBlur={true}
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={onSubmit}
        enableReinitialize={true}
      >
        {({
          isSubmitting,
          errors,
          handleSubmit,
          isValid,
          touched,
        }) => (
          <>
            {isSubmitting ? (
              // Hide form and show loading spinner during submission
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 20px',
                textAlign: 'center'
              }}>
                <Spinner
                  animation="border"
                  variant="primary"
                  style={{
                    width: '48px',
                    height: '48px',
                    marginBottom: '16px'
                  }}
                />
                <div style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: 'var(--vscode-foreground)',
                  marginBottom: '8px'
                }}>
                  Signing in...
                </div>
                <div style={{
                  fontSize: '14px',
                  color: 'var(--vscode-descriptionForeground)'
                }}>
                  Please wait while we authenticate your credentials
                </div>
              </div>
            ) : (
              // Show form when not submitting
              <form onSubmit={handleSubmit} className="form">
                <Row>
                  <Col md={12}>
                    <label htmlFor="username" className="nice-form-control">
                      <b>
                        User Name:{" "}
                        {touched.username && !errors.username && (
                          <span className="okCheck">
                            <FaCheckCircle />
                          </span>
                        )}
                      </b>
                      <Field
                        name="username"
                        type="text"
                        className={
                          errors.username
                            ? "form-control field-error  glow-button sad"
                            : "form-control glow-button happy"
                        }
                      />
                      <ErrorMessage
                        className="error"
                        name="username"
                        component="div"
                      />
                    </label>
                  </Col>
                </Row>
                <Row>
                  <Col md={12}>
                    <label htmlFor="password" className="nice-form-control">
                      <b>
                        Password:{" "}
                        {touched.password && !errors.password && (
                          <span className="okCheck">
                            <FaCheckCircle />
                          </span>
                        )}
                      </b>
                      <Field
                        name="password"
                        type="password"
                        className={
                          errors.password
                            ? "form-control field-error glow-button sad"
                            : "form-control glow-button happy"
                        }
                      />
                      <ErrorMessage
                        className="error"
                        name="password"
                        component="div"
                      />
                    </label>
                  </Col>
                </Row>
                <Row>
                  <Col>
                    {!isLoggedIn && (
                      <VSCodeButton
                        className="glow-button happy form-control"
                        disabled={!isValid || isSubmitting}
                        type="submit"
                      >
                        <FiUserCheck size={30} /> Login Now
                      </VSCodeButton>
                    )}
                  </Col>
                </Row>
              </form>
            )}
          </>
        )}
      </Formik>
    </div>
  );
};

export default Form;
