import {
  ErrorMessage,
  Field,
  Formik,
  FormikHelpers,
} from "formik";
import React from "react";
import { Col, Row, Spinner } from "react-bootstrap";
import { FaCheckCircle } from "react-icons/fa";
import { FiUserCheck } from "react-icons/fi";
import * as Yup from "yup";
import { useLoginUserMutation } from "../../redux/services/AuthService";
import { Login } from "@thor/model";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import ApplicationsList from "../account/ApplicationsList";

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
  const [loginUser, loginUserResult] = useLoginUserMutation();
  const loginFailed = loginUserResult.status === "rejected";

  const initialValues: Login = {
    username: "",
    password: "",
  };

  return (
    <div>
      {isLoggedIn && (
        <div style={{ marginBottom: "1em" }}>
          <VSCodeButton onClick={onLogout} type="button" style={{ marginRight: "1em" }}>
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
          <form onSubmit={handleSubmit} className="form">
            {loginFailed && (
              <Row>
                <Col>
                  <div className="error">
                    Login failed.
                  </div>
                </Col>
              </Row>
            )}
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
                        ? "form-control field-error"
                        : "form-control"
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
                        ? "form-control field-error"
                        : "form-control"
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
                    disabled={!isValid || loginUserResult.isLoading}
                    type="submit"
                  >
                    {isSubmitting && (
                      <Spinner
                        style={{ display: "none", float: "left" }}
                        as="span"
                        animation="grow"
                        variant="light"
                      />
                    )}
                    <FiUserCheck size={30} /> Login Now
                  </VSCodeButton>
                )}
                {isLoggedIn && (
                  <VSCodeButton
                    disabled={!isValid || loginUserResult.isLoading}
                    type="submit"
                    style={{ marginLeft: "1em" }}
                  >
                    <FiUserCheck size={30} /> Switch User
                  </VSCodeButton>
                )}
              </Col>
            </Row>
          </form>
        )}
      </Formik>
    </div>
  );
};

export default Form;
