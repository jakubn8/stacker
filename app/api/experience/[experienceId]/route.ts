import { NextRequest, NextResponse } from "next/server";
import { whopsdk } from "@/lib/whop-sdk";

export const dynamic = "force-dynamic";

/**
 * GET /api/experience/[experienceId]
 * Validates user access and returns experience info
 * Only accessible to members who have access to this community
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ experienceId: string }> }
): Promise<NextResponse> {
  try {
    const { experienceId } = await params;

    if (!experienceId) {
      return NextResponse.json(
        { error: "Experience ID is required" },
        { status: 400 }
      );
    }

    // Verify the user has access to this experience
    // The user token comes from Whop's iframe/SDK
    const authResult = await whopsdk.verifyUserToken(request.headers, {
      dontThrow: true,
    });

    if (!authResult) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get experience details from Whop
    // The experience contains the company_id we need
    try {
      const experience = await whopsdk.experiences.retrieve(experienceId);

      if (!experience) {
        return NextResponse.json(
          { error: "Experience not found" },
          { status: 404 }
        );
      }

      // Extract company ID from the response
      // Response format: { company: { id: "biz_xxx", title: "...", route: "..." } }
      const companyId = experience.company?.id || experience.company_id;

      if (!companyId) {
        console.error("No company ID in experience response:", experience);
        return NextResponse.json(
          { error: "Could not determine company for this experience" },
          { status: 400 }
        );
      }

      // Return the company ID so we can fetch products
      return NextResponse.json({
        success: true,
        experienceId,
        companyId,
        companyName: experience.company?.title || null,
        accessLevel: "customer", // Members accessing experience are customers
      });
    } catch (expError) {
      console.error("Experience lookup failed:", expError);
      return NextResponse.json(
        { error: "Failed to load experience. Please try again." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Experience access error:", error);
    return NextResponse.json(
      { error: "Failed to verify access" },
      { status: 500 }
    );
  }
}
