import { NextRequest, NextResponse } from "next/server";
import { getUniversalLink } from "@selfxyz/core";
import { SelfAppBuilder } from "@selfxyz/qrcode";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    const app = new SelfAppBuilder({
      version: 2,
      appName: process.env.NEXT_PUBLIC_SELF_APP_NAME || "Self Workshop",
      scope: process.env.NEXT_PUBLIC_SELF_SCOPE || "self-workshop",
      endpoint: `${process.env.NEXT_PUBLIC_SELF_ENDPOINT}`,
      logoBase64: "https://i.postimg.cc/mrmVf9hm/self.png",
      userId: `0x${uuidv4().replace(/-/g, '')}`,
      endpointType: "staging_https",
      userIdType: "hex",
      userDefinedData: "Identity Check!",
      disclosures: {
        minimumAge: 18,
        nationality: true,
      }
    }).build();

    const universalLink = getUniversalLink(app);

    return NextResponse.json({
      success: true,
      universalLink,
      userId: app.userId,
      appConfig: app,
    });
  } catch (error) {
    console.error("Error generating universal link:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to generate universal link",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
