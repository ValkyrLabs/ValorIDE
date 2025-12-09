import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * VALKYR DESIGN SYSTEM - USER AVATAR
 *
 * A beautiful, reusable avatar component inspired by Jony Ive's design philosophy:
 * - Clarity through simplicity
 * - Attention to the smallest details
 * - Delightful micro-interactions
 *
 * Features:
 * - Drag-and-drop image upload
 * - Graceful fallback to initials with semantic colors
 * - Multiple size variants (xs, sm, md, lg, xl)
 * - Online/offline status indicator
 * - Edit overlay on hover (when editable)
 * - Accessible and keyboard-friendly
 */
import { useState, useRef, useCallback, useMemo } from "react";
import { Image, Spinner } from "react-bootstrap";
import { FaCamera, FaCheck, FaTimes } from "react-icons/fa";
import axios from "axios";
import { BASE_PATH } from "@thor/src";
import "./UserAvatar.css";
// Semantic color palette for initials background - beautiful pastels
const AVATAR_COLORS = [
  { bg: "#FF6B6B", text: "#FFFFFF" }, // Coral Red
  { bg: "#4ECDC4", text: "#FFFFFF" }, // Teal
  { bg: "#45B7D1", text: "#FFFFFF" }, // Sky Blue
  { bg: "#96CEB4", text: "#1A1A2E" }, // Sage Green
  { bg: "#FFEAA7", text: "#1A1A2E" }, // Warm Yellow
  { bg: "#DDA0DD", text: "#1A1A2E" }, // Plum
  { bg: "#98D8C8", text: "#1A1A2E" }, // Mint
  { bg: "#F7DC6F", text: "#1A1A2E" }, // Gold
  { bg: "#BB8FCE", text: "#FFFFFF" }, // Lavender
  { bg: "#85C1E9", text: "#1A1A2E" }, // Light Blue
  { bg: "#F8B500", text: "#1A1A2E" }, // Amber
  { bg: "#00CEC9", text: "#FFFFFF" }, // Cyan
];
// Size configurations in pixels
const SIZE_MAP = {
  xs: { size: 24, fontSize: 10, iconSize: 8, borderWidth: 1 },
  sm: { size: 32, fontSize: 12, iconSize: 10, borderWidth: 2 },
  md: { size: 48, fontSize: 16, iconSize: 14, borderWidth: 2 },
  lg: { size: 64, fontSize: 20, iconSize: 18, borderWidth: 3 },
  xl: { size: 96, fontSize: 28, iconSize: 24, borderWidth: 3 },
  xxl: { size: 140, fontSize: 40, iconSize: 36, borderWidth: 4 },
};
/**
 * Generate a consistent color based on the user's name/username
 */
const getAvatarColor = (seed) => {
  if (!seed) {
    return AVATAR_COLORS[0];
  }
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};
/**
 * Generate initials from name
 */
const getInitials = (firstName, lastName, username) => {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (firstName) {
    return firstName.slice(0, 2).toUpperCase();
  }
  if (lastName) {
    return lastName.slice(0, 2).toUpperCase();
  }
  if (username) {
    return username.slice(0, 2).toUpperCase();
  }
  return "?";
};
export const UserAvatar = ({
  avatarUrl,
  firstName,
  lastName,
  username,
  size = "md",
  editable = false,
  onAvatarChange,
  onUploaded,
  showStatus = false,
  isOnline = false,
  className = "",
  style,
  title,
  onClick,
  borderColor,
  showRing = false,
  ringColor = "#0acffe",
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState(false);
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef(null);
  const sizeConfig = SIZE_MAP[size];
  const initials = useMemo(
    () => getInitials(firstName, lastName, username),
    [firstName, lastName, username],
  );
  const colorSeed = `${firstName || ""}${lastName || ""}${username || ""}`;
  const avatarColors = useMemo(() => getAvatarColor(colorSeed), [colorSeed]);
  // Handle file upload
  const uploadFile = useCallback(
    async (file) => {
      if (!file.type.startsWith("image/")) {
        setUploadError(true);
        setTimeout(() => setUploadError(false), 2000);
        return;
      }
      setIsUploading(true);
      setUploadError(false);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const token = sessionStorage.getItem("jwtToken");
        const headers = {
          "Content-Type": "multipart/form-data",
        };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        const response = await axios.post(
          `${BASE_PATH}/files/upload`,
          formData,
          {
            headers,
          },
        );
        const media = response.data;
        if (media.mediaUrl) {
          onAvatarChange?.(media.mediaUrl);
          onUploaded?.(media);
          setUploadSuccess(true);
          setImageError(false);
          setTimeout(() => setUploadSuccess(false), 2000);
        }
      } catch (error) {
        console.error("Avatar upload failed:", error);
        setUploadError(true);
        setTimeout(() => setUploadError(false), 2000);
      } finally {
        setIsUploading(false);
      }
    },
    [onAvatarChange, onUploaded],
  );
  // Drag and drop handlers
  const handleDragOver = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!editable) {
        return;
      }
      setIsDragOver(true);
    },
    [editable],
  );
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (!editable) {
        return;
      }
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        uploadFile(files[0]);
      }
    },
    [editable, uploadFile],
  );
  // Click to upload
  const handleClick = useCallback(() => {
    if (editable && fileInputRef.current) {
      fileInputRef.current.click();
    } else if (onClick) {
      onClick();
    }
  }, [editable, onClick]);
  const handleFileChange = useCallback(
    (e) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        uploadFile(files[0]);
      }
      // Reset input so same file can be selected again
      e.target.value = "";
    },
    [uploadFile],
  );
  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick],
  );
  // Should we show the image or fallback to initials?
  const showImage = avatarUrl && !imageError;
  // Build container styles
  const containerStyle = {
    width: sizeConfig.size,
    height: sizeConfig.size,
    fontSize: sizeConfig.fontSize,
    borderWidth: sizeConfig.borderWidth,
    borderColor: borderColor || (showRing ? ringColor : "transparent"),
    boxShadow: showRing
      ? `0 0 0 ${sizeConfig.borderWidth + 1}px ${ringColor}40`
      : undefined,
    cursor: editable || onClick ? "pointer" : "default",
    ...style,
  };
  // Build initials background style
  const initialsStyle = {
    backgroundColor: avatarColors.bg,
    color: avatarColors.text,
  };
  return _jsxs("div", {
    className: `user-avatar-container ${className} ${editable ? "editable" : ""} ${isDragOver ? "drag-over" : ""} ${isUploading ? "uploading" : ""}`,
    style: containerStyle,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
    onClick: handleClick,
    onKeyDown: handleKeyDown,
    role: editable || onClick ? "button" : undefined,
    tabIndex: editable || onClick ? 0 : undefined,
    title: title || (editable ? "Click or drag to upload avatar" : undefined),
    "aria-label": `Avatar for ${firstName || username || "user"}`,
    children: [
      editable &&
        _jsx("input", {
          ref: fileInputRef,
          type: "file",
          accept: "image/*",
          onChange: handleFileChange,
          style: { display: "none" },
          "aria-hidden": "true",
        }),
      _jsx("div", {
        className: "user-avatar-content",
        children: showImage
          ? _jsx(Image, {
              src: avatarUrl,
              alt: `${firstName || username || "User"} avatar`,
              className: "user-avatar-image",
              roundedCircle: true,
              onError: handleImageError,
            })
          : _jsx("div", {
              className: "user-avatar-initials",
              style: initialsStyle,
              children: initials,
            }),
      }),
      editable &&
        !isUploading &&
        _jsx("div", {
          className: "user-avatar-overlay",
          children: _jsx(FaCamera, { size: sizeConfig.iconSize }),
        }),
      isUploading &&
        _jsx("div", {
          className: "user-avatar-spinner",
          children: _jsx(Spinner, {
            animation: "border",
            size: "sm",
            style: { width: sizeConfig.iconSize, height: sizeConfig.iconSize },
          }),
        }),
      uploadSuccess &&
        _jsx("div", {
          className: "user-avatar-success",
          children: _jsx(FaCheck, { size: sizeConfig.iconSize }),
        }),
      uploadError &&
        _jsx("div", {
          className: "user-avatar-error",
          children: _jsx(FaTimes, { size: sizeConfig.iconSize }),
        }),
      showStatus &&
        _jsx("div", {
          className: `user-avatar-status ${isOnline ? "online" : "offline"}`,
          style: {
            width: Math.max(8, sizeConfig.size * 0.2),
            height: Math.max(8, sizeConfig.size * 0.2),
            borderWidth: Math.max(2, sizeConfig.borderWidth),
          },
        }),
    ],
  });
};
export default UserAvatar;
//# sourceMappingURL=index.js.map
