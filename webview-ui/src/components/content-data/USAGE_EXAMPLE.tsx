/**
 * ContentDataFlipBoard — Usage Examples
 *
 * This file demonstrates various ways to integrate and customize
 * the ContentDataFlipBoard component in your application.
 */

import React from "react";
import { ContentDataFlipBoard } from "./index";

/**
 * Example 1: Basic Usage
 * Simplest possible integration with default props.
 */
export function BasicExample() {
  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <h1>Content Gallery</h1>
      <ContentDataFlipBoard />
    </div>
  );
}

/**
 * Example 2: Customized with Props
 * Adjust carousel behavior via props.
 */
export function CustomizedExample() {
  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
      <h1>Featured Content</h1>
      <ContentDataFlipBoard
        itemsPerPage={8}
        autoScroll={true}
        autoScrollInterval={4000}
      />
    </div>
  );
}

/**
 * Example 3: Manual Control
 * Disable auto-scroll for user-controlled browsing.
 */
export function ManualControlExample() {
  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      <h1>Browse Content</h1>
      <p>Use the navigation buttons to explore</p>
      <ContentDataFlipBoard
        itemsPerPage={6}
        autoScroll={false}
      />
    </div>
  );
}

/**
 * Example 4: Responsive Container
 * Adaptive sizing for different screen sizes.
 */
export function ResponsiveExample() {
  return (
    <div style={{
      width: "100%",
      height: "600px",
      maxWidth: "1200px",
      margin: "0 auto",
    }}>
      <ContentDataFlipBoard
        itemsPerPage={5}
        autoScroll={true}
        autoScrollInterval={5000}
      />
    </div>
  );
}

/**
 * Example 5: Landing Page Section
 * Premium presentation on landing page.
 */
export function LandingPageExample() {
  return (
    <section style={{
      padding: "60px 20px",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "white",
    }}>
      <div style={{
        maxWidth: "1200px",
        margin: "0 auto",
      }}>
        <h1 style={{
          textAlign: "center",
          marginBottom: "10px",
          fontSize: "36px",
          fontWeight: "bold",
        }}>
          Explore Our Content Library
        </h1>

        <p style={{
          textAlign: "center",
          marginBottom: "40px",
          fontSize: "16px",
          opacity: 0.9,
        }}>
          Browse through our curated collection of premium content
        </p>

        <div style={{
          height: "500px",
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: "12px",
          padding: "20px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
        }}>
          <ContentDataFlipBoard
            itemsPerPage={6}
            autoScroll={true}
            autoScrollInterval={5000}
          />
        </div>

        <div style={{
          marginTop: "40px",
          textAlign: "center",
        }}>
          <button style={{
            padding: "12px 30px",
            background: "white",
            color: "#667eea",
            border: "none",
            borderRadius: "6px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
          }}>
            View All Content
          </button>
        </div>
      </div>
    </section>
  );
}

/**
 * Export all examples for storybook or demo purposes
 */
export const Examples = {
  Basic: BasicExample,
  Customized: CustomizedExample,
  ManualControl: ManualControlExample,
  Responsive: ResponsiveExample,
  LandingPage: LandingPageExample,
};