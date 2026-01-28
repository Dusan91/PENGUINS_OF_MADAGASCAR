THIS IS ONLY IN WEB-SHELL PROJECT, DONT TOUCH OTHER PROJECTS
On the paths 
packages/shared/src/domain/kycDocuments/kycDocuments.service.ts
refactor uploadKycDocument function
Look in other files, for example packages/betting/src/infrastructure/betting/ticket/ticket-auth.service.ts for reference
I had this in previous app (which is in angular and i want to use it here)
public uploadVerificationDocumentList(documentList: Array<IUserDocument>) {
        const params = new HttpParams();
        const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
        return this.http.put<any>(this.domainService.getAddress() + '/profile/uploadVerificationDocumentList.html', documentList, {
            headers: headers,
            params: params
        });
    }

    export class IUserDocument {
    userUuid: string;
    documentType: string;
    mimeType: string;
    uploadedAt: any;
    document: any;
    bankAccount: string;
}

We need to remap documentList like this
 let documentList:{
      userUuid: string;
      documentType: string;
      mimeType: string;
      uploadedAt: number;
      document: File;
      bankAccount: string | null;
    }[] = []
    documents.forEach(doc => {
      documentList.push({
        userUuid: "",
        documentType,
        mimeType: doc.type, 
        uploadedAt: doc.lastModified,
        document: doc,
        bankAccount: null
      })
    })


    DONT ADD NEW LYBS OR CHANGE ANYTHING ELSE, IF THERE IS CHANGE NOTIFY ME 
    DONT COMMIT 