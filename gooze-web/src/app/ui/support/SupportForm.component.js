/**
 * Created by yparedes on 9/20/18.
 */
import React from "react";

import appConfig from "app/app.config";

export default SupportForm;

function SupportForm() {

	return (
    <div className="col-6 m-auto">
      <div className="row">
          <h3>Contacto</h3>
      </div>

      <div className="row">
        <form method="POST" action={`${appConfig.apiPath}/GoozeUsers/support`} className="col-12">

          <div className="form-group">
            <label>Correo:</label>
            <input type="email" className="form-control" name="email" required/>
          </div>

          <div className="form-group">
            <label>Asunto:</label>
            <input type="text" className="form-control" name="subject" required/>
          </div>

          <div className="form-group">
            <label>Mensaje:</label>
            <textarea className="form-control" name="text" required/>
          </div>

          <button type="submit" className="btn btn-primary">Enviar</button>
        </form>
      </div>
    </div>
	);
}
