import PDFDocument from 'pdfkit';

export class PDFService {
  /**
   * Generates a beautifully formatted ESG performance certificate PDF.
   */
  static generateESGCertificate(stream: NodeJS.WritableStream, data: {
    orgName: string;
    envScore: number;
    socialScore: number;
    govScore: number;
    totalScore: number;
    co2SavedKg: number;
    employeesCount: number;
    activePolicies: number;
    challengesCompleted: number;
  }): void {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 40, left: 50, right: 50 },
    });

    doc.pipe(stream);

    // 1. Decorative Borders (ESG Emerald Green Theme)
    doc.rect(20, 20, 555, 802)
       .strokeColor('#10B981')
       .lineWidth(3)
       .stroke();

    doc.rect(25, 25, 545, 792)
       .strokeColor('#34D399')
       .lineWidth(1)
       .stroke();

    // 2. Header Logo & Title
    doc.moveDown(2);
    doc.fillColor('#10B981')
       .font('Helvetica-Bold')
       .fontSize(28)
       .text('ECOSPHERE', { align: 'center', characterSpacing: 2 });

    doc.fillColor('#475569')
       .font('Helvetica')
       .fontSize(10)
       .text('ENVIRONMENTAL, SOCIAL & GOVERNANCE COMPLIANCE', { align: 'center', characterSpacing: 1 });

    doc.moveDown(1);
    
    // Emerald horizontal divider
    doc.moveTo(50, doc.y)
       .lineTo(545, doc.y)
       .strokeColor('#E2E8F0')
       .lineWidth(1)
       .stroke();

    doc.moveDown(2);

    // 3. Document Main Label
    doc.fillColor('#0F172A')
       .font('Helvetica-Bold')
       .fontSize(18)
       .text('ESG PERFORMANCE CERTIFICATE', { align: 'center' });

    doc.moveDown(0.5);
    
    doc.fillColor('#64748B')
       .font('Helvetica-Oblique')
       .fontSize(12)
       .text(`Awarded to: ${data.orgName}`, { align: 'center' });

    doc.moveDown(2);

    // 4. Score Showcase (3 Column Layout + Center Highlight)
    doc.fillColor('#0F172A')
       .font('Helvetica-Bold')
       .fontSize(14)
       .text('VERIFIED ESG PERFORMANCE RATING', 50, doc.y);
    
    doc.moveDown(0.5);

    const scoreY = doc.y;

    // Draw background card for scores
    doc.rect(50, scoreY, 495, 120)
       .fillColor('#F8FAFC')
       .fill();

    // Score Rings/Bars Details
    doc.fillColor('#0F172A');
    
    // Col 1: Environmental
    doc.font('Helvetica-Bold').fontSize(11).text('ENVIRONMENTAL', 70, scoreY + 20);
    doc.font('Helvetica-Bold').fontSize(24).fillColor('#10B981').text(`${data.envScore.toFixed(0)}/100`, 70, scoreY + 45);
    doc.font('Helvetica').fontSize(9).fillColor('#64748B').text('Emissions & Goals', 70, scoreY + 80);

    // Col 2: Social
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A').text('SOCIAL', 220, scoreY + 20);
    doc.font('Helvetica-Bold').fontSize(24).fillColor('#3B82F6').text(`${data.socialScore.toFixed(0)}/100`, 220, scoreY + 45);
    doc.font('Helvetica').fontSize(9).fillColor('#64748B').text('CSR & Engagement', 220, scoreY + 80);

    // Col 3: Governance
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A').text('GOVERNANCE', 370, scoreY + 20);
    doc.font('Helvetica-Bold').fontSize(24).fillColor('#F59E0B').text(`${data.govScore.toFixed(0)}/100`, 370, scoreY + 45);
    doc.font('Helvetica').fontSize(9).fillColor('#64748B').text('Policies & Auditing', 370, scoreY + 80);

    doc.y = scoreY + 140;

    // 5. Total Score Highlight Banner
    const totalScoreY = doc.y;
    doc.rect(50, totalScoreY, 495, 50)
       .fillColor('#10B981')
       .fill();

    doc.fillColor('#FFFFFF')
       .font('Helvetica-Bold')
       .fontSize(16)
       .text(`TOTAL ESG RATING: ${data.totalScore.toFixed(1)}%`, 70, totalScoreY + 16, { align: 'center' });

    doc.y = totalScoreY + 80;

    // 6. Impact Stats Table
    doc.fillColor('#0F172A')
       .font('Helvetica-Bold')
       .fontSize(14)
       .text('KEY SUSTAINABILITY METRICS', 50, doc.y);

    doc.moveDown(0.5);

    const statsY = doc.y;
    
    // Draw Stats Table Grid
    doc.rect(50, statsY, 495, 140).strokeColor('#E2E8F0').lineWidth(1).stroke();
    
    // Rows
    const rowHeight = 35;
    doc.moveTo(50, statsY + rowHeight).lineTo(545, statsY + rowHeight).stroke();
    doc.moveTo(50, statsY + rowHeight * 2).lineTo(545, statsY + rowHeight * 2).stroke();
    doc.moveTo(50, statsY + rowHeight * 3).lineTo(545, statsY + rowHeight * 3).stroke();

    // Column Divider
    doc.moveTo(300, statsY).lineTo(300, statsY + 140).stroke();

    // Row 1: CO2 Saved
    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(10).text('Carbon CO2 Avoided / Offset:', 60, statsY + 12);
    doc.font('Helvetica').fontSize(10).fillColor('#475569').text(`${data.co2SavedKg.toLocaleString()} kg CO2`, 315, statsY + 12);

    // Row 2: Active Policies Acknowledged
    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(10).text('Active Governance Policies Wired:', 60, statsY + 12 + rowHeight);
    doc.font('Helvetica').fontSize(10).fillColor('#475569').text(`${data.activePolicies} Corporate Policies`, 315, statsY + 12 + rowHeight);

    // Row 3: Challenges Completed
    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(10).text('Sustainability Challenges Completed:', 60, statsY + 12 + rowHeight * 2);
    doc.font('Helvetica').fontSize(10).fillColor('#475569').text(`${data.challengesCompleted} Employee Successes`, 315, statsY + 12 + rowHeight * 2);

    // Row 4: Total Headcount
    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(10).text('Total Active ESG Account Headcount:', 60, statsY + 12 + rowHeight * 3);
    doc.font('Helvetica').fontSize(10).fillColor('#475569').text(`${data.employeesCount} Employees Active`, 315, statsY + 12 + rowHeight * 3);

    doc.y = statsY + 170;

    // 7. Footer Signatures & Date
    const signatureY = doc.y;

    doc.fillColor('#64748B')
       .font('Helvetica')
       .fontSize(9)
       .text(`Generated: ${new Date().toLocaleDateString()}`, 50, signatureY + 40);

    doc.text('Verification Code: ECS-COMP-901-TRX', 50, signatureY + 55);

    doc.moveTo(380, signatureY + 30)
       .lineTo(520, signatureY + 30)
       .strokeColor('#94A3B8')
       .stroke();

    doc.fillColor('#475569')
       .font('Helvetica-Bold')
       .fontSize(9)
       .text('EcoSphere Auditor Signoff', 380, signatureY + 40, { align: 'center', width: 140 });

    doc.fillColor('#94A3B8')
       .font('Helvetica')
       .fontSize(8)
       .text('AUTOMATED AUDITING SYSTEM', 380, signatureY + 52, { align: 'center', width: 140 });

    doc.end();
  }
}
export default PDFService;
