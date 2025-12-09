import { NextRequest, NextResponse } from "next/server";
import { whopsdk } from "@/lib/whop-sdk";
import { saveExperienceIdForCompany } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/experiences/[experienceId]
 * Validates user access and returns experience info
 * Only accessible to members who have access to this experience
 *
 * Auth flow per Whop docs:
 * 1. Verify user token → get userId
 * 2. Check access with experienceId → get access_level (customer/admin/no_access)
 * 3. If has_access, fetch experience details for company info
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

    // Step 1: Verify the user token to get userId
    const tokenResult = await whopsdk.verifyUserToken(request.headers, {
      dontThrow: true,
    });

    if (!tokenResult || !tokenResult.userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { userId } = tokenResult;

    // Step 2: Check user's access level for this experience
    const accessResult = await whopsdk.users.checkAccess(experienceId, {
      id: userId,
    });

    if (!accessResult.has_access) {
      return NextResponse.json(
        { error: "You don't have access to this experience" },
        { status: 403 }
      );
    }

    // Step 3: Get experience details to find the company
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
      const companyId = experience.company?.id;

      if (!companyId) {
        console.error("No company ID in experience response:", experience);
        return NextResponse.json(
          { error: "Could not determine company for this experience" },
          { status: 400 }
        );
      }

      // Save the experienceId for this company (for sending notifications later)
      // This runs in the background - don't await to avoid slowing down the response
      saveExperienceIdForCompany(companyId, experienceId).catch((err) => {
        console.error("Failed to save experienceId:", err);
      });

      return NextResponse.json({
        success: true,
        experienceId,
        companyId,
        companyName: experience.company?.title || null,
        accessLevel: accessResult.access_level, // "customer" or "admin"
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
