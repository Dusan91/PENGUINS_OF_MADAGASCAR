============================================================================================================================================================
DONT ADD NEW LYBS OR CHANGE ANYTHING ELSE, IF THERE IS CHANGE NOTIFY ME !
DONT COMMIT !
============================================================================================================================================================

============================================================================================================================================================

U ovom fajlu `packages/betting/src/components/ticket/shared/components/ticket-alert-container.tsx` 
`
  const handleCancel = () => {
    alert?.buttons?.[1]?.handler?.()
    clearAlert()
  }
` kopira tiket. Medjutim tiken sa tom kvotom nije selektovan u listi. 
Slicnu funkcionalnsot imamo i ovde `packages/betting/src/components/ticket/shell/my-bets/played-ticket/played-ticket-bottom-buttons.tsx` za express tikete, `  const onCopyTicket = () => {
    handleCopyTicket(ticket, {
      pathname,
      onNavigate: () => router.push('/ticket'),
      onClose: () => setIsDialogOpen?.(false),
    })
  }`.

  Da li mozes za prvu funkcionalnsot napraviti da bude isto ka i za drugu? 
  



============================================================================================================================================================

============================================================================================================================================================
Koristi react-query, zod i react-form-hooks
Dont install nothing new, ask me if you need to

DONT ADD NEW LYBS OR CHANGE ANYTHING ELSE, IF THERE IS CHANGE NOTIFY ME !
DONT COMMIT !
============================================================================================================================================================


