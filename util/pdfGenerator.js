import { jsPDF } from 'jspdf';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readFileSync } from 'fs';
import { PDFDocument } from 'pdf-lib';

import pkg from 'jspdf-autotable';
const {autoTable} = pkg

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function generateFacture(body){
    
    const logo = readFileSync(path.join(__dirname,"pogo.png"));

    const doc = new jsPDF();
    const head = [["Nom Emetteur","Prenom Emetteur","Téléphone Emetteur","Montant","Date d'Opération"]];

    doc.autoTable({
        head,
        body: body.paiments.map((paym) => {
            const date = new Date(paym.dateOperation);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const formattedDate = `${day}/${month}/${year}`;
            const formattedTime = date.toLocaleTimeString('en-GB');
              return [
              paym.emeteur?.nom,
              paym.emeteur?.prenom,
              '0'+paym.emeteur?.telephone,
              paym.montant,
              `${formattedDate} ${formattedTime}`
            ];
          }),
        startY: 70,
        margin: { top: 30, bottom: 50 },
        didDrawPage: (data) => {

          // Add header
            doc.addImage(logo.toString('base64'),'PNG', data.settings.margin.left, 10, 60, 18)
            doc.setFontSize(13);
            doc.text('Destinataire: '+body.destinataire.nom +"  "+body.destinataire.prenom, data.settings.margin.left, 40);
            doc.text('RIB: '+body.destinataire.safeToken, data.settings.margin.left, 50);
          // Add footer
          const pageCount = doc.internal.getNumberOfPages();
          doc.setFontSize(10);
          doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber} of ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
        
          doc.text('Total: '+body.total+" DH", doc.internal.pageSize.width-60, doc.internal.pageSize.height - 40);
            // doc.text('RIB: '+body.destinataire.safeToken, data.settings.margin.left, 50);
        
          // Add description section
          if (data.pageCount > 1) {
            const pageHeight = doc.internal.pageSize.height;
            doc.setFontSize(12);
            doc.text('Description section content goes here.', data.settings.margin.left, pageHeight - 30);
          }
        },
});
// Convert the PDF to a buffer
const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

return pdfBuffer
}

export default generateFacture