export const maxDuration = 300;

type ScreenRouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: ScreenRouteProps) {
  const { id } = await params;
  // Dynamic import keeps pdf-parse/mammoth from being evaluated at module
  // load time, which crashes Node.js with "DOMMatrix is not defined".
  const { processApplicationScreening } = await import("@/lib/screening/process-application");
  const result = await processApplicationScreening(id);

  return Response.json({
    applicationId: id,
    ...result,
  });
}
