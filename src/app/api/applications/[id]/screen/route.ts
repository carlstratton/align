import { processApplicationScreening } from "@/lib/screening/process-application";

export const maxDuration = 300;

type ScreenRouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: ScreenRouteProps) {
  const { id } = await params;
  const result = await processApplicationScreening(id);

  return Response.json({
    applicationId: id,
    ...result,
  });
}
