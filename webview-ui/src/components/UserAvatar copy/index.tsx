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

import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  DragEvent,
} from "react";
import { Image, Spinner } from "react-bootstrap";
import { FaCamera, FaUser, FaCheck, FaTimes } from "react-icons/fa";
import axios from "axios";
import { BASE_PATH } from "@thor/src";
import { ContentMediaLink } from "@thor/model/ContentMediaLink";
import "./UserAvatar.css";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "xxl";

export interface UserAvatarProps {
  /** User's avatar URL */
  avatarUrl?: string | null;
  /** User's first name for initials */
  firstName?: string | null;
  /** User's last name for initials */
  lastName?: string | null;
  /** Fallback username if no name provided */
  username?: string | null;
  /** Size variant */
  size?: AvatarSize;
  /** Whether the avatar can be edited/uploaded */
  editable?: boolean;
  /** Callback when avatar is uploaded */
  onAvatarChange?: (mediaUrl: string) => void;
  /** Callback with full ContentMediaLink */
  onUploaded?: (media: ContentMediaLink) => void;
  /** Show online status indicator */
  showStatus?: boolean;
  /** Online status */
  isOnline?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Custom styles */
  style?: React.CSSProperties;
  /** Tooltip text */
  title?: string;
  /** Click handler (for opening profile, etc.) */
  onClick?: () => void;
  /** Border color/style */
  borderColor?: string;
  /** Show a ring around the avatar */
  showRing?: boolean;
  /** Ring color */
  ringColor?: string;
}

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
const SIZE_MAP: Record<
  AvatarSize,
  { size: number; fontSize: number; iconSize: number; borderWidth: number }
> = {
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
const getAvatarColor = (seed: string): { bg: string; text: string } => {
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
const getInitials = (
  firstName?: string | null,
  lastName?: string | null,
  username?: string | null,
): string => {
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

export const UserAvatar: React.FC<UserAvatarProps> = ({
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeConfig = SIZE_MAP[size];
  const initials = useMemo(
    () => getInitials(firstName, lastName, username),
    [firstName, lastName, username],
  );
  const colorSeed = `${firstName || ""}${lastName || ""}${username || ""}`;
  const avatarColors = useMemo(() => getAvatarColor(colorSeed), [colorSeed]);

  // Handle file upload
  const uploadFile = useCallback(
    async (file: File) => {
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
        const headers: Record<string, string> = {
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

        const media: ContentMediaLink = response.data;

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
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!editable) {
        return;
      }
      setIsDragOver(true);
    },
    [editable],
  );

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
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
    (e: React.ChangeEvent<HTMLInputElement>) => {
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
    (e: React.KeyboardEvent) => {
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
  const containerStyle: React.CSSProperties = {
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
  const initialsStyle: React.CSSProperties = {
    backgroundColor: avatarColors.bg,
    color: avatarColors.text,
  };

  return (
    <div
      className={`user-avatar-container ${className} ${editable ? "editable" : ""} ${isDragOver ? "drag-over" : ""} ${isUploading ? "uploading" : ""}`}
      style={containerStyle}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={editable || onClick ? "button" : undefined}
      tabIndex={editable || onClick ? 0 : undefined}
      title={title || (editable ? "Click or drag to upload avatar" : undefined)}
      aria-label={`Avatar for ${firstName || username || "user"}`}
    >
      {/* Hidden file input */}
      {editable && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: "none" }}
          aria-hidden="true"
        />
      )}

      {/* Avatar content */}
      <div className="user-avatar-content">
        {showImage ? (
          <Image
            src={avatarUrl}
            alt={`${firstName || username || "User"} avatar`}
            className="user-avatar-image"
            roundedCircle
            onError={handleImageError}
          />
        ) : (
          <div className="user-avatar-initials" style={initialsStyle}>
            {initials}
          </div>
        )}
      </div>

      {/* Edit overlay (shown on hover when editable) */}
      {editable && !isUploading && (
        <div className="user-avatar-overlay">
          <FaCamera size={sizeConfig.iconSize} />
        </div>
      )}

      {/* Upload spinner */}
      {isUploading && (
        <div className="user-avatar-spinner">
          <Spinner
            animation="border"
            size="sm"
            style={{ width: sizeConfig.iconSize, height: sizeConfig.iconSize }}
          />
        </div>
      )}

      {/* Success indicator */}
      {uploadSuccess && (
        <div className="user-avatar-success">
          <FaCheck size={sizeConfig.iconSize} />
        </div>
      )}

      {/* Error indicator */}
      {uploadError && (
        <div className="user-avatar-error">
          <FaTimes size={sizeConfig.iconSize} />
        </div>
      )}

      {/* Online status indicator */}
      {showStatus && (
        <div
          className={`user-avatar-status ${isOnline ? "online" : "offline"}`}
          style={{
            width: Math.max(8, sizeConfig.size * 0.2),
            height: Math.max(8, sizeConfig.size * 0.2),
            borderWidth: Math.max(2, sizeConfig.borderWidth),
          }}
        />
      )}
    </div>
  );
};

export default UserAvatar;
