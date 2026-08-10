import { prisma } from "../src/lib/prisma";
import { reportStorageService } from "../src/lib/report-storage";
import { writeFileSync } from "fs";

async function main() {
  const email = process.argv[2] || "carpenter.kevin+test@gmail.com";
  const outDir = process.argv[3] || "/tmp";

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      children: true,
      parentOrders: {
        include: { kits: { include: { child: true } } },
      },
    },
  });

  if (!user) {
    console.log(JSON.stringify({ error: "no user", email }, null, 2));
    return;
  }

  const summary: any = { email, userId: user.id, orders: [] };

  for (const order of user.parentOrders) {
    const o: any = {
      orderNumber: order.orderNumber,
      status: order.status,
      kits: [],
    };
    for (const kit of order.kits) {
      o.kits.push({
        kitId: kit.id,
        kitNumber: kit.kitNumber,
        child: kit.child?.firstName ?? null,
        parentReportFileName: kit.parentReportFileName,
        reportFileName: kit.reportFileName,
        fullLabReportFileName: kit.fullLabReportFileName,
        genomeDataFileName: kit.genomeDataFileName,
        exploreConsentedAt: kit.exploreConsentedAt,
      });
    }
    summary.orders.push(o);
  }

  console.log(JSON.stringify(summary, null, 2));

  const target = user.parentOrders
    .flatMap((o) => o.kits)
    .find((k) => k.parentReportFileName || k.reportFileName);

  if (!target) {
    console.log("No report file on any kit.");
    return;
  }

  const fileName = (target.parentReportFileName || target.reportFileName)!;
  const url = await reportStorageService.getReportUrl(fileName);
  const res = await fetch(url);
  if (!res.ok) {
    console.log("download failed", res.status);
    return;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const base = fileName.split("/").pop() || "report.pdf";
  const out = `${outDir}/${base}`;
  writeFileSync(out, buf);
  console.log(JSON.stringify({ downloaded: out, bytes: buf.byteLength, fileName }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
